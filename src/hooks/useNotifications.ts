'use client';

import { useState, useEffect, useRef } from 'react';
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

export function useNotifications(): NotificationsState & NotificationsActions {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const initRef = useRef(false);

  // 极简连接函数 - 没有任何依赖
  const connectWs = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: 已连接，跳过');
      return;
    }

    console.log('WebSocket: 创建连接');
    const ws = new WebSocket('wss://forge.matrix-net.tech/graphql');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket: 连接成功');
      setConnected(true);
      setLoading(false);
      
      // 简单认证
      const token = localStorage.getItem('access_token');
      if (token) {
        ws.send(JSON.stringify({ type: 'auth', access_token: token }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        if (msg.type === 'auth' && msg.status === 'ok') {
          // 订阅通知
          ws.send(JSON.stringify({
            type: 'subscribe',
            collection: 'orders',
            query: { fields: ['*'] }
          }));
        }
      } catch (error) {
        console.error('WebSocket消息错误:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket: 连接关闭');
      setConnected(false);
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      setConnected(false);
    };
  };

  const disconnectWs = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  };

  // 只在用户登录时连接一次
  useEffect(() => {
    if (user && !initRef.current) {
      initRef.current = true;
      connectWs();
    } else if (!user) {
      initRef.current = false;
      disconnectWs();
    }

    return () => {
      if (!user) {
        disconnectWs();
      }
    };
  }, [user?.id]); // 只依赖用户ID

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      const filtered = prev.filter(n => n.id !== id);
      
      if (notification && !notification.read) {
        setUnreadCount(current => Math.max(0, current - 1));
      }
      
      return filtered;
    });
  };

  const refresh = () => {
    disconnectWs();
    setTimeout(connectWs, 1000);
  };

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
    connect: connectWs,
    disconnect: disconnectWs
  };
}