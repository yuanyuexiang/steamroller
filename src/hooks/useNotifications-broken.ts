'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import { useAuth } from '@providers/AuthProvider';
import type { Notification, WebSocketMessage } from '@types';

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  loading: boolean;
  connectionAttempts: number;
}

export interface NotificationsActions {
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  refresh: () => void;
  connect: () => void;
  disconnect: () => void;
}

async function fetchWebSocketConfig(): Promise<string | null> {
  try {
    const response = await fetch('/api/websocket');
    if (!response.ok) {
      console.error('WebSocket配置获取失败:', response.statusText);
      return null;
    }
    const config = await response.json();
    return config.wsUrl;
  } catch (error) {
    console.error('WebSocket配置请求错误:', error);
    return null;
  }
}

export function useNotifications(): NotificationsState & NotificationsActions {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const connectingRef = useRef<boolean>(false); // 添加连接锁
  const connectionAttemptsRef = useRef<number>(0); // 使用 ref 避免依赖项更新
  const wsConfigRef = useRef<string | null>(null); // 缓存 WebSocket 配置
  const initializedRef = useRef<boolean>(false); // 添加初始化标志
  
  const { user } = useAuth();
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3秒

  const connect = useCallback(async () => {
    // 防止并发连接
    if (connectingRef.current) {
      console.log('WebSocket: 连接正在进行中，跳过');
      return;
    }

    // 如果已经有连接且状态正常，直接返回
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: 连接已存在，跳过');
      return;
    }

    connectingRef.current = true;

    // 获取token
    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('directus_auth_token');
    
    if (!token) {
      console.error('WebSocket: 未找到认证令牌');
      setLoading(false);
      connectingRef.current = false;
      return;
    }

    // 清理现有连接
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      console.log('WebSocket: 清理现有连接');
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      console.log('WebSocket: 开始连接流程');
      setLoading(true);
      
      // 使用 ref 避免状态更新触发重新渲染
      connectionAttemptsRef.current++;
      const currentAttempts = connectionAttemptsRef.current;
      setConnectionAttempts(currentAttempts);
      console.log(`WebSocket: 第 ${currentAttempts} 次连接尝试`);
      
      // 获取WebSocket URL配置 (只在第一次或缓存为空时获取)
      let configUrl = wsConfigRef.current;
      if (!configUrl) {
        console.log('WebSocket: 获取配置 (仅第一次)');
        configUrl = await fetchWebSocketConfig();
        if (configUrl) {
          wsConfigRef.current = configUrl; // 缓存配置
        }
      } else {
        console.log('WebSocket: 使用缓存的配置');
      }
      
      if (!configUrl) {
        console.error('WebSocket: 无法获取配置');
        setLoading(false);
        connectingRef.current = false;
        return;
      }

      console.log('WebSocket: 尝试连接到Directus WebSocket端点:', configUrl);
      
      // 创建WebSocket连接
      const ws = new WebSocket(configUrl);
      wsRef.current = ws;

      // 设置连接超时
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket: 连接超时');
          ws.close();
        }
      }, 10000); // 10秒超时

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket: 连接成功建立');
        setConnected(true);
        setLoading(false);
        connectionAttemptsRef.current = 0; // 连接成功后重置计数
        setConnectionAttempts(0);
        connectingRef.current = false;
        
        // 发送认证消息
        const authMessage = {
          type: 'auth',
          access_token: token
        };
        
        console.log('WebSocket: 发送认证消息');
        ws.send(JSON.stringify(authMessage));
      };

      ws.onmessage = (event) => {
        try {
          const receivedMessage: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket: 收到消息:', receivedMessage);

          // 处理认证响应
          if (receivedMessage.type === 'auth') {
            if (receivedMessage.status === 'ok') {
              console.log('WebSocket: 认证成功，开始订阅数据变化');
              subscribeToCollections(ws);
            } else {
              console.error('WebSocket: 认证失败', receivedMessage);
              ws.close();
            }
            return;
          }

          // 处理订阅消息
          if (receivedMessage.type === 'subscription' && receivedMessage.event) {
            handleSubscriptionMessage(receivedMessage);
          }

          // 处理心跳消息
          if (receivedMessage.type === 'heartbeat') {
            console.log('WebSocket: 收到心跳消息');
          }

        } catch (error) {
          console.error('WebSocket: 消息处理错误:', error);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket: 连接错误:', error);
        setConnected(false);
        setLoading(false);
        connectingRef.current = false;
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket: 连接关闭, Code:', event.code, 'Reason:', event.reason);
        setConnected(false);
        setLoading(false);
        connectingRef.current = false;
        subscriptionsRef.current.clear();
        
        // 只有在非手动关闭且连接尝试次数未超限时才重连
        if (event.code !== 1000 && connectionAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, Math.min(connectionAttemptsRef.current, 3));
          console.log(`WebSocket: ${delay/1000}秒后尝试重连 (第${connectionAttemptsRef.current + 1}/${maxReconnectAttempts}次)`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (connectionAttemptsRef.current >= maxReconnectAttempts) {
          console.error('WebSocket: 已达到最大重连次数，停止重连');
          message.error('WebSocket连接失败，请检查网络或联系管理员');
        }
      };

    } catch (error) {
      console.error('WebSocket: 连接失败:', error);
      setConnected(false);
      setLoading(false);
      connectingRef.current = false;
    }
  }, []); // 移除所有依赖项

  // 订阅数据集合变化
  const subscribeToCollections = useCallback((ws: WebSocket) => {
    const collections = [
      'users',
      'products', 
      'boutiques',
      'orders', 
      'customers',
      'categories',
      'terminals',
      'visits',
      'views'
    ];

    collections.forEach(collection => {
      const subscriptionMessage = {
        type: 'subscribe',
        collection: collection,
        query: {
          fields: ['*'],
          filter: {}
        }
      };

      console.log('WebSocket: 订阅集合变化:', collection);
      ws.send(JSON.stringify(subscriptionMessage));
      subscriptionsRef.current.add(collection);
    });
  }, []);

  // 处理订阅消息
  const handleSubscriptionMessage = useCallback((receivedMessage: WebSocketMessage) => {
    const { event: eventType, data, collection } = receivedMessage;
    
    // 创建通知消息
    let notificationTitle = '';
    let notificationMessage = '';
    let notificationType: 'info' | 'success' | 'warning' | 'error' = 'info';
    
    switch (eventType) {
      case 'create':
        notificationTitle = '新建记录';
        notificationMessage = `在 ${collection} 中创建了新记录`;
        notificationType = 'success';
        break;
      case 'update':
        notificationTitle = '更新记录';
        notificationMessage = `${collection} 中的记录已更新`;
        notificationType = 'info';
        break;
      case 'delete':
        notificationTitle = '删除记录';
        notificationMessage = `从 ${collection} 中删除了记录`;
        notificationType = 'warning';
        break;
      default:
        notificationTitle = '数据变化';
        notificationMessage = `${collection} 中的数据发生了变化`;
    }

    const notification: Notification = {
      id: `${Date.now()}-${Math.random()}`,
      title: notificationTitle,
      message: notificationMessage,
      type: notificationType,
      timestamp: new Date().toISOString(),
      read: false,
      data: {
        collection,
        event: eventType,
        item: data
      }
    };

    setNotifications(prev => [notification, ...prev.slice(0, 99)]);
    setUnreadCount(prev => prev + 1);
    
    // 显示系统通知
    message[notificationType](`${notificationTitle}: ${notificationMessage}`);
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    connectingRef.current = false; // 重置连接锁
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setConnected(false);
    connectionAttemptsRef.current = 0; // 重置计数器
    setConnectionAttempts(0);
    subscriptionsRef.current.clear();
    console.log('WebSocket: 用户手动断开连接');
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      const filtered = prev.filter(n => n.id !== id);
      
      if (notification && !notification.read) {
        setUnreadCount(current => Math.max(0, current - 1));
      }
      
      return filtered;
    });
  }, []);

  const refresh = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connectionAttemptsRef.current = 0;
      setConnectionAttempts(0);
      connect();
    }, 1000);
  }, [connect, disconnect]);

  // 自动连接 - 只在初始化时执行一次
  useEffect(() => {
    if (user && !initializedRef.current) {
      console.log('WebSocket: 用户已登录，初始化连接');
      initializedRef.current = true;
      connect();
    } else if (!user && initializedRef.current) {
      console.log('WebSocket: 用户已登出，断开连接');
      initializedRef.current = false;
      disconnect();
    }
    
    return () => {
      // 组件卸载时断开连接
      if (wsRef.current) {
        disconnect();
      }
    };
  }, [user]); // 只依赖 user

  // 清理定时器
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    connected,
    loading,
    connectionAttempts,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    connect,
    disconnect
  };
}