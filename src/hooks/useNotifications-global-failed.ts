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

// 全局单例 - 确保只有一个连接
let globalWs: WebSocket | null = null;
let globalConnecting = false;
let globalConfigUrl: string | null = null;
let globalConnectionCount = 0;
let globalAutoConnect = false;
let globalReconnectTimeout: NodeJS.Timeout | null = null;

// 全局函数 - 避免 useCallback 依赖项问题
const getWebSocketConfig = async (): Promise<string | null> => {
  if (globalConfigUrl) {
    console.log('WebSocket: 使用全局缓存配置', globalConfigUrl);
    return globalConfigUrl;
  }

  try {
    console.log('WebSocket: 获取配置 (全局首次)');
    const response = await fetch('/api/websocket');
    if (!response.ok) {
      console.error('WebSocket配置获取失败:', response.statusText);
      return null;
    }
    const config = await response.json();
    globalConfigUrl = config.wsUrl;
    console.log('WebSocket: 全局配置已缓存', config.wsUrl);
    return config.wsUrl;
  } catch (error) {
    console.error('WebSocket配置请求错误:', error);
    return null;
  }
};

const subscribeToCollections = (ws: WebSocket) => {
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

    console.log('WebSocket: 全局订阅集合变化:', collection);
    ws.send(JSON.stringify(subscriptionMessage));
  });
};

const createGlobalConnection = async (
  onConnected: (connected: boolean) => void,
  onLoading: (loading: boolean) => void,
  onMessage: (msg: WebSocketMessage) => void
) => {
  // 严格的全局连接控制
  if (globalConnecting) {
    console.log('WebSocket: 全局连接中，跳过新请求');
    return;
  }
  
  if (globalWs?.readyState === WebSocket.OPEN) {
    console.log('WebSocket: 全局已连接，跳过');
    return;
  }

  globalConnecting = true;
  onLoading(true);
  
  const token = localStorage.getItem('access_token') || 
                localStorage.getItem('authToken') || 
                localStorage.getItem('directus_auth_token');
  
  if (!token) {
    console.error('WebSocket: 未找到认证令牌');
    onLoading(false);
    globalConnecting = false;
    return;
  }

  // 清理现有连接
  if (globalWs) {
    globalWs.close();
    globalWs = null;
  }

  try {
    globalConnectionCount++;
    console.log(`WebSocket: 全局第 ${globalConnectionCount} 次连接尝试`);
    
    // 获取配置
    const configUrl = await getWebSocketConfig();
    if (!configUrl) {
      console.error('WebSocket: 无法获取全局配置');
      onLoading(false);
      globalConnecting = false;
      return;
    }

    console.log('WebSocket: 全局连接到:', configUrl);
    const ws = new WebSocket(configUrl);
    globalWs = ws;

    const timeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket: 全局连接超时');
        ws.close();
      }
    }, 10000);

    ws.onopen = () => {
      clearTimeout(timeout);
      console.log('WebSocket: 全局连接成功');
      onConnected(true);
      onLoading(false);
      globalConnecting = false;
      globalConnectionCount = 0;
      
      const authMessage = { type: 'auth', access_token: token };
      ws.send(JSON.stringify(authMessage));
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket: 全局收到消息:', msg.type);

        if (msg.type === 'auth') {
          if (msg.status === 'ok') {
            console.log('WebSocket: 全局认证成功');
            subscribeToCollections(ws);
          } else {
            console.error('WebSocket: 全局认证失败', msg);
            ws.close();
          }
        } else if (msg.type === 'subscription' && msg.event) {
          onMessage(msg);
        }
      } catch (error) {
        console.error('WebSocket: 全局消息处理错误:', error);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      console.error('WebSocket: 全局连接错误:', error);
      onConnected(false);
      onLoading(false);
      globalConnecting = false;
    };

    ws.onclose = (event) => {
      clearTimeout(timeout);
      console.log(`WebSocket: 全局连接关闭 [${event.code}] ${event.reason}`);
      onConnected(false);
      onLoading(false);
      globalConnecting = false;
      
      // 重连逻辑
      if (event.code !== 1000 && globalConnectionCount < 3 && globalAutoConnect) {
        const delay = 5000 * Math.pow(2, Math.min(globalConnectionCount - 1, 2));
        console.log(`WebSocket: 全局 ${delay/1000}秒后重连`);
        
        globalReconnectTimeout = setTimeout(() => {
          if (globalAutoConnect) {
            createGlobalConnection(onConnected, onLoading, onMessage);
          }
        }, delay);
      } else if (globalConnectionCount >= 3) {
        console.error('WebSocket: 全局达到最大重连次数');
        message.error('WebSocket连接失败，请手动刷新');
      }
    };

  } catch (error) {
    console.error('WebSocket: 全局连接创建失败:', error);
    onConnected(false);
    onLoading(false);
    globalConnecting = false;
  }
};

const disconnectGlobal = () => {
  console.log('WebSocket: 全局手动断开连接');
  globalAutoConnect = false;
  
  if (globalReconnectTimeout) {
    clearTimeout(globalReconnectTimeout);
    globalReconnectTimeout = null;
  }
  
  globalConnecting = false;
  
  if (globalWs) {
    globalWs.close(1000, 'Manual disconnect');
    globalWs = null;
  }
  
  globalConnectionCount = 0;
};

export function useNotifications(): NotificationsState & NotificationsActions {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const { user } = useAuth();
  const initializeRef = useRef(false);

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

  const connect = useCallback(() => {
    console.log('WebSocket: 组件请求连接');
    globalAutoConnect = true;
    createGlobalConnection(setConnected, setLoading, handleSubscriptionMessage);
    setConnectionAttempts(globalConnectionCount);
  }, [handleSubscriptionMessage]);

  const disconnect = useCallback(() => {
    console.log('WebSocket: 组件请求断开');
    disconnectGlobal();
    setConnected(false);
    setConnectionAttempts(0);
  }, []);

  const refresh = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  }, [connect, disconnect]);

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

  // 一次性初始化
  useEffect(() => {
    if (user && !initializeRef.current) {
      console.log('WebSocket: 用户首次登录，初始化全局连接');
      initializeRef.current = true;
      connect();
    } else if (!user && initializeRef.current) {
      console.log('WebSocket: 用户登出，清理全局连接');
      initializeRef.current = false;
      disconnect();
    }

    return () => {
      // 组件卸载时不一定断开全局连接，让其他组件复用
      console.log('WebSocket: 组件卸载（保持全局连接）');
    };
  }, [user]);

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