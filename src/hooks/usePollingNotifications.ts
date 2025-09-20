/**
 * WebSocket Fallback - 轮询方案
 * 当WebSocket连接失败时，使用HTTP轮询获取实时更新
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { useAuth } from '@providers/AuthProvider';
import { Notification } from '@types';

export interface PollingNotificationsConfig {
  enabled: boolean;
  interval: number; // 轮询间隔（毫秒）
  collections: string[]; // 需要监听的集合
}

const DEFAULT_CONFIG: PollingNotificationsConfig = {
  enabled: true,
  interval: 10000, // 10秒轮询一次
  collections: ['orders', 'customers', 'products', 'boutiques', 'terminals']
};

export function usePollingNotifications(config: PollingNotificationsConfig = DEFAULT_CONFIG) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Record<string, string>>({});

  // 获取集合的最后更新时间
  const fetchCollectionUpdate = useCallback(async (collection: string) => {
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetLatestUpdate($collection: String!) {
              ${collection}(limit: 1, sort: ["-date_updated"]) {
                id
                date_updated
                date_created
              }
            }
          `,
          variables: { collection }
        })
      });

      const data = await response.json();
      const items = data.data?.[collection];
      
      if (items && items.length > 0) {
        const latestUpdate = items[0].date_updated || items[0].date_created;
        const previousUpdate = lastUpdateRef.current[collection];
        
        // 如果检测到更新
        if (previousUpdate && latestUpdate !== previousUpdate) {
          const notification: Notification = {
            id: `polling_${collection}_${Date.now()}`,
            type: 'info',
            title: `${getCollectionDisplayName(collection)}有更新`,
            message: `${getCollectionDisplayName(collection)}数据已更新`,
            timestamp: new Date().toISOString(),
            read: false,
            action: {
              type: 'navigate',
              url: getCollectionUrl(collection),
              label: '查看更新'
            }
          };

          setNotifications(prev => [notification, ...prev]);
          
          message.info({
            content: `${notification.title}: ${notification.message}`,
            duration: 4,
          });
        }
        
        lastUpdateRef.current[collection] = latestUpdate;
      }
    } catch (error) {
      console.error(`轮询 ${collection} 失败:`, error);
    }
  }, []);

  // 开始轮询
  const startPolling = useCallback(() => {
    if (!config.enabled || !user || intervalRef.current) {
      return;
    }

    console.log('开始轮询实时更新...');
    setIsPolling(true);

    // 立即执行一次
    config.collections.forEach(collection => {
      fetchCollectionUpdate(collection);
    });

    // 设置定时轮询
    intervalRef.current = setInterval(() => {
      config.collections.forEach(collection => {
        fetchCollectionUpdate(collection);
      });
    }, config.interval);
  }, [config, user, fetchCollectionUpdate]);

  // 停止轮询
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
    console.log('停止轮询');
  }, []);

  // 辅助函数
  const getCollectionDisplayName = useCallback((collection: string): string => {
    const nameMap: Record<string, string> = {
      'orders': '订单',
      'customers': '客户',
      'products': '产品',
      'boutiques': '门店',
      'terminals': '终端',
      'users': '用户'
    };
    return nameMap[collection] || collection;
  }, []);

  const getCollectionUrl = useCallback((collection: string): string => {
    const urlMap: Record<string, string> = {
      'orders': '/orders',
      'customers': '/customers',
      'products': '/products',
      'boutiques': '/boutiques',
      'terminals': '/terminals',
      'users': '/users'
    };
    return urlMap[collection] || `/${collection}`;
  }, []);

  // 自动开始轮询
  useEffect(() => {
    if (user && config.enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [user, config.enabled, startPolling, stopPolling]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    connected: isPolling,
    loading: false,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    startPolling,
    stopPolling,
    isPolling
  };
}