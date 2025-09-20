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

function attemptConnection(url: string, token: string): Promise<WebSocket | null> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    
    const timeout = setTimeout(() => {
      ws.close();
      resolve(null);
    }, 5000);
    
    ws.onopen = () => {
      clearTimeout(timeout);
      // 根据Directus文档，使用消息模式进行handshake
      ws.send(JSON.stringify({
        type: 'auth',
        access_token: token
      }));
      
      // 等待认证响应
      const authTimeout = setTimeout(() => {
        ws.close();
        resolve(null);
      }, 3000);
      
      const handleAuthMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'auth' && message.status === 'ok') {
            clearTimeout(authTimeout);
            ws.removeEventListener('message', handleAuthMessage);
            resolve(ws);
          } else if (message.type === 'auth' && message.status === 'error') {
            clearTimeout(authTimeout);
            ws.close();
            resolve(null);
          }
        } catch (error) {
          clearTimeout(authTimeout);
          ws.close();
          resolve(null);
        }
      };
      
      ws.addEventListener('message', handleAuthMessage);
    };
    
    ws.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    
    ws.onclose = () => {
      clearTimeout(timeout);
      resolve(null);
    };
  });
}

export function useNotifications(wsUrl?: string): NotificationsState & NotificationsActions {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  
  const { user } = useAuth();

  const connect = useCallback(async () => {
    // 获取token
    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('directus_auth_token');
    
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      console.log('WebSocket: 开始连接流程');
      setLoading(true);
      
      // 获取WebSocket URL配置
      let websocketUrl = wsUrl;
      
      if (!websocketUrl) {
        console.log('WebSocket: 获取配置中...');
        const configUrl = await fetchWebSocketConfig();
        if (!configUrl) {
          console.error('WebSocket: 无法获取配置');
          setLoading(false);
          return;
        }
        websocketUrl = configUrl;
      }

      console.log('WebSocket: 尝试连接到Directus WebSocket端点:', websocketUrl);
      
      // 尝试连接
      const ws = await attemptConnection(websocketUrl, token);
      
      if (!ws) {
        console.error('WebSocket: 连接失败');
        setLoading(false);
        return;
      }
      
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket: 连接已建立');
        setConnected(true);
        setLoading(false);
        
        // 订阅所有集合的变化
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
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket: 收到消息:', message);

          if (message.type === 'subscription' && message.event) {
            const { event: eventType, data } = message;
            
            // 创建通知消息
            let notificationTitle = '';
            let notificationDescription = '';
            
            switch (eventType) {
              case 'create':
                notificationTitle = '新建记录';
                notificationDescription = `在 ${message.collection} 中创建了新记录`;
                break;
              case 'update':
                notificationTitle = '更新记录';
                notificationDescription = `${message.collection} 中的记录已更新`;
                break;
              case 'delete':
                notificationTitle = '删除记录';
                notificationDescription = `从 ${message.collection} 中删除了记录`;
                break;
              default:
                notificationTitle = '数据变化';
                notificationDescription = `${message.collection} 中的数据发生了变化`;
            }

            const notification: Notification = {
              id: `${Date.now()}-${Math.random()}`,
              title: notificationTitle,
              message: notificationDescription,
              type: 'info',
              timestamp: new Date().toISOString(),
              read: false,
              data: {
                collection: message.collection,
                event: eventType,
                item: data
              }
            };

            setNotifications(prev => [notification, ...prev.slice(0, 99)]);
            setUnreadCount(prev => prev + 1);
            
            // 显示系统通知
            console.log(`${notificationTitle}: ${notificationDescription}`);
          }
        } catch (error) {
          console.error('WebSocket: 消息处理错误:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket: 连接错误:', error);
        setConnected(false);
        setLoading(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket: 连接关闭, Code:', event.code, 'Reason:', event.reason);
        setConnected(false);
        setLoading(false);
        subscriptionsRef.current.clear();
        
        // 如果不是手动关闭，尝试重连
        if (event.code !== 1000) {
          console.log('WebSocket: 5秒后尝试重连');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

    } catch (error) {
      console.error('WebSocket: 连接失败:', error);
      setConnected(false);
      setLoading(false);
      
      // 重连
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    }
  }, [wsUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setConnected(false);
    subscriptionsRef.current.clear();
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
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // 自动连接
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

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
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    connect,
    disconnect
  };
}