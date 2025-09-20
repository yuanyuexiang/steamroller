'use client';

import { useState, useCallback } from 'react';
import type { Notification } from '@types';

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

// 完全禁用 WebSocket 的版本 - 立即停止所有连接请求
export function useNotifications(): NotificationsState & NotificationsActions {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // 这些函数什么都不做 - 完全禁用 WebSocket
  const connect = useCallback(() => {
    console.log('WebSocket: 已禁用，不会连接');
  }, []);

  const disconnect = useCallback(() => {
    console.log('WebSocket: 已禁用，无需断开');
  }, []);

  const refresh = useCallback(() => {
    console.log('WebSocket: 已禁用，无需刷新');
  }, []);

  return {
    notifications,
    unreadCount,
    connected: false, // 始终显示未连接
    loading: false,   // 始终不加载
    connectionAttempts: 0,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    connect,
    disconnect
  };
}