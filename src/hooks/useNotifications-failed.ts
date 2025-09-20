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

// 简化版本 - 完全控制连接生命周期
export function useNotifications(): NotificationsState & NotificationsActions {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // 所有状态使用 ref 管理，避免依赖项更新
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const isConnectingRef = useRef<boolean>(false);
  const connectionCountRef = useRef<number>(0);
  const wsConfigUrlRef = useRef<string | null>(null);
  const autoConnectEnabledRef = useRef<boolean>(false);
  
  const { user } = useAuth();
  const maxReconnectAttempts = 3;
  const reconnectDelay = 5000;

  // 获取 WebSocket 配置 - 只获取一次
  const getWebSocketConfig = useCallback(async (): Promise<string | null> => {
    if (wsConfigUrlRef.current) {
      console.log('WebSocket: 使用缓存配置', wsConfigUrlRef.current);
      return wsConfigUrlRef.current;
    }

    try {
      console.log('WebSocket: 获取配置 (首次)');
      const response = await fetch('/api/websocket');
      if (!response.ok) {
        console.error('WebSocket配置获取失败:', response.statusText);
        return null;
      }
      const config = await response.json();
      wsConfigUrlRef.current = config.wsUrl;
      console.log('WebSocket: 配置已缓存', config.wsUrl);
      return config.wsUrl;
    } catch (error) {
      console.error('WebSocket配置请求错误:', error);
      return null;
    }
  }, []);

  // 订阅数据集合变化
  const subscribeToCollections = useCallback((ws: WebSocket) => {
    const collections = [
      'users', 'products', 'boutiques', 'orders', 
      'customers', 'categories', 'terminals', 'visits', 'views'
    ];

    collections.forEach(collection => {
      const subscriptionMessage = {
        type: 'subscribe',
        collection: collection,
        query: { fields: ['*'], filter: {} }
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
      data: { collection, event: eventType, item: data }
    };

    setNotifications(prev => [notification, ...prev.slice(0, 99)]);
    setUnreadCount(prev => prev + 1);
    
    // 显示系统通知
    message[notificationType](`${notificationTitle}: ${notificationMessage}`);
  }, []);

  // 连接函数 - 严格控制
  const connect = useCallback(async () => {
    // 严格的连接控制
    if (isConnectingRef.current) {
      console.log('WebSocket: 连接中，跳过新请求');
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: 已连接，跳过');
      return;
    }

    isConnectingRef.current = true;
    setLoading(true);
    
    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('directus_auth_token');
    
    if (!token) {
      console.error('WebSocket: 未找到认证令牌');
      setLoading(false);
      isConnectingRef.current = false;
      return;
    }

    // 清理现有连接
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      connectionCountRef.current++;
      const attempts = connectionCountRef.current;
      setConnectionAttempts(attempts);
      console.log(`WebSocket: 第 ${attempts} 次连接尝试`);
      
      // 获取配置
      const configUrl = await getWebSocketConfig();
      if (!configUrl) {
        console.error('WebSocket: 无法获取配置');
        setLoading(false);
        isConnectingRef.current = false;
        return;
      }

      console.log('WebSocket: 连接到:', configUrl);
      const ws = new WebSocket(configUrl);
      wsRef.current = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket: 连接超时');
          ws.close();
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('WebSocket: 连接成功');
        setConnected(true);
        setLoading(false);
        isConnectingRef.current = false;
        connectionCountRef.current = 0;
        setConnectionAttempts(0);
        
        const authMessage = { type: 'auth', access_token: token };
        ws.send(JSON.stringify(authMessage));
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket: 收到消息:', msg.type);

          if (msg.type === 'auth') {
            if (msg.status === 'ok') {
              console.log('WebSocket: 认证成功');
              subscribeToCollections(ws);
            } else {
              console.error('WebSocket: 认证失败', msg);
              ws.close();
            }
          } else if (msg.type === 'subscription' && msg.event) {
            handleSubscriptionMessage(msg);
          }
        } catch (error) {
          console.error('WebSocket: 消息处理错误:', error);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('WebSocket: 连接错误:', error);
        setConnected(false);
        setLoading(false);
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        console.log(`WebSocket: 连接关闭 [${event.code}] ${event.reason}`);
        setConnected(false);
        setLoading(false);
        isConnectingRef.current = false;
        subscriptionsRef.current.clear();
        
        // 重连逻辑
        if (event.code !== 1000 && connectionCountRef.current < maxReconnectAttempts && autoConnectEnabledRef.current) {
          const delay = reconnectDelay * Math.pow(2, Math.min(connectionCountRef.current - 1, 2));
          console.log(`WebSocket: ${delay/1000}秒后重连`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (autoConnectEnabledRef.current) {
              connect();
            }
          }, delay);
        } else if (connectionCountRef.current >= maxReconnectAttempts) {
          console.error('WebSocket: 达到最大重连次数');
          message.error('WebSocket连接失败，请手动刷新');
        }
      };

    } catch (error) {
      console.error('WebSocket: 连接创建失败:', error);
      setConnected(false);
      setLoading(false);
      isConnectingRef.current = false;
    }
  }, []); // 完全移除依赖项 - 这是关键修复！

  const disconnect = useCallback(() => {
    console.log('WebSocket: 手动断开连接');
    autoConnectEnabledRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    isConnectingRef.current = false;
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setConnected(false);
    connectionCountRef.current = 0;
    setConnectionAttempts(0);
    subscriptionsRef.current.clear();
  }, []);

  const refresh = useCallback(() => {
    disconnect();
    setTimeout(() => {
      autoConnectEnabledRef.current = true;
      connect();
    }, 1000);
  }, []); // 移除依赖项

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
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

  // 自动连接管理 - 简单明了
  useEffect(() => {
    if (user) {
      console.log('WebSocket: 用户登录，启用自动连接');
      autoConnectEnabledRef.current = true;
      connect();
    } else {
      console.log('WebSocket: 用户登出，禁用自动连接');
      disconnect();
    }

    return () => {
      console.log('WebSocket: 组件卸载，清理连接');
      disconnect();
    };
  }, [user]); // 只依赖 user - 不依赖 connect/disconnect

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