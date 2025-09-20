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

// 全局变量 - 确保整个应用只有一个连接
let globalWs: WebSocket | null = null;
let globalConnecting = false;
let globalConfigUrl: string | null = null;

export function useNotifications(): NotificationsState & NotificationsActions {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const { user } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const hasInitialized = useRef(false);

  // 获取 WebSocket 配置 - 只调用一次
  const fetchWebSocketConfig = useCallback(async (): Promise<string | null> => {
    if (globalConfigUrl) {
      console.log('WebSocket: 使用缓存配置');
      return globalConfigUrl;
    }

    try {
      console.log('WebSocket: 获取配置');
      const response = await fetch('/api/websocket');
      if (!response.ok) {
        console.error('WebSocket配置获取失败:', response.statusText);
        return null;
      }
      const config = await response.json();
      globalConfigUrl = config.wsUrl;
      console.log('WebSocket: 配置已缓存:', globalConfigUrl);
      return globalConfigUrl;
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
    
    message[notificationType](`${notificationTitle}: ${notificationMessage}`);
  }, []);

  // 连接函数 - 绝对不会重复调用
  const connect = useCallback(async () => {
    // 全局锁 - 防止重复连接
    if (globalConnecting) {
      console.log('WebSocket: 全局连接中，跳过');
      return;
    }

    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      console.log('WebSocket: 全局已连接，跳过');
      setConnected(true);
      return;
    }

    globalConnecting = true;
    setLoading(true);
    console.log('WebSocket: 开始全局连接');

    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('directus_auth_token');
    
    if (!token) {
      console.error('WebSocket: 未找到认证令牌');
      setLoading(false);
      globalConnecting = false;
      return;
    }

    try {
      setConnectionAttempts(prev => prev + 1);
      
      const configUrl = await fetchWebSocketConfig();
      if (!configUrl) {
        console.error('WebSocket: 无法获取配置');
        setLoading(false);
        globalConnecting = false;
        return;
      }

      // 清理现有连接
      if (globalWs) {
        globalWs.close();
        globalWs = null;
      }

      console.log('WebSocket: 创建全局连接到:', configUrl);
      const ws = new WebSocket(configUrl);
      globalWs = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket: 连接超时');
          ws.close();
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('WebSocket: 全局连接成功');
        setConnected(true);
        setLoading(false);
        globalConnecting = false;
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
          } else if (msg.type === 'heartbeat') {
            console.log('WebSocket: 心跳');
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
        globalConnecting = false;
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        console.log(`WebSocket: 连接关闭 [${event.code}] ${event.reason}`);
        setConnected(false);
        setLoading(false);
        globalConnecting = false;
        subscriptionsRef.current.clear();
        globalWs = null;
        
        // 只在非手动关闭且用户存在时重连
        if (event.code !== 1000 && user) {
          console.log('WebSocket: 5秒后重连');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (user && !globalConnecting) {
              connect();
            }
          }, 5000);
        }
      };

    } catch (error) {
      console.error('WebSocket: 连接创建失败:', error);
      setConnected(false);
      setLoading(false);
      globalConnecting = false;
    }
  }, [user, fetchWebSocketConfig, subscribeToCollections, handleSubscriptionMessage]);

  const disconnect = useCallback(() => {
    console.log('WebSocket: 手动断开全局连接');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    globalConnecting = false;
    
    if (globalWs) {
      globalWs.close(1000, 'Manual disconnect');
      globalWs = null;
    }
    
    setConnected(false);
    setConnectionAttempts(0);
    subscriptionsRef.current.clear();
  }, []);

  const refresh = useCallback(() => {
    disconnect();
    setTimeout(() => {
      if (user) {
        connect();
      }
    }, 1000);
  }, [connect, disconnect, user]);

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

  // 只在用户首次登录时初始化连接
  useEffect(() => {
    if (user && !hasInitialized.current) {
      console.log('WebSocket: 用户登录，初始化连接');
      hasInitialized.current = true;
      connect();
    } else if (!user && hasInitialized.current) {
      console.log('WebSocket: 用户登出，断开连接');
      hasInitialized.current = false;
      disconnect();
    }
  }, [user]); // 只依赖 user，不依赖 connect/disconnect

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