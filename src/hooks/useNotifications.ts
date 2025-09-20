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
  const connectWs = async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: 已连接，跳过');
      return;
    }

    console.log('WebSocket: 创建连接');
    const ws = new WebSocket('wss://forge.matrix-net.tech/websocket');
    wsRef.current = ws;

    ws.onopen = async () => {
      console.log('WebSocket: 连接成功');
      setConnected(true);
      setLoading(false);
      
      // 使用 TokenManager 获取有效认证令牌
      try {
        const { TokenManager } = await import('@lib/auth/token-manager');
        const token = await TokenManager.getValidToken();
        
        if (token) {
          console.log('WebSocket: 开始认证');
          // Directus WebSocket 认证格式
          ws.send(JSON.stringify({
            type: 'auth',
            access_token: token
          }));
        } else {
          console.error('WebSocket: 未找到有效令牌');
          ws.close();
        }
      } catch (error) {
        console.error('WebSocket: 获取令牌失败', error);
        ws.close();
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket: 收到消息:', msg.type, msg.event);
        
        if (msg.type === 'auth') {
          if (msg.status === 'ok') {
            console.log('WebSocket: 认证成功');
            
            // 订阅所有重要实体的事件
            const collections = ['boutiques', 'categories', 'customers', 'orders', 'products', 'terminals', 'directus_users', 'views', 'visits'];
            const events = ['create', 'update', 'delete'];
            
            collections.forEach(collection => {
              events.forEach(event => {
                console.log(`WebSocket: 订阅 ${collection} ${event} 事件`);
                ws.send(JSON.stringify({
                  type: 'subscribe',
                  collection: collection,
                  event: event
                }));
              });
            });
          } else {
            console.error('WebSocket: 认证失败', msg);
            ws.close();
          }
        } else if (msg.type === 'subscription') {
          // 现在只会收到 create、update、delete 事件，没有 init 事件了
          if (msg.event === 'create') {
            console.log('WebSocket: 新建记录', msg.collection, msg.data);
            
            // 根据不同实体类型生成通知
            let title = '新记录';
            let notificationText = '';
            let notificationType: 'info' | 'success' | 'warning' | 'error' = 'success';
            
            switch (msg.collection) {
              case 'orders':
                title = '新订单';
                notificationText = `收到新的订单 #${msg.data?.id}`;
                break;
              case 'customers':
                title = '新客户';
                notificationText = `新客户注册: ${msg.data?.nick_name || msg.data?.name || msg.data?.id}`;
                break;
              case 'products':
                title = '新产品';
                notificationText = `添加了新产品: ${msg.data?.name || msg.data?.id}`;
                break;
              case 'boutiques':
                title = '新店铺';
                notificationText = `新店铺开业: ${msg.data?.name || msg.data?.id}`;
                break;
              case 'directus_users':
                title = '新用户';
                notificationText = `新用户加入: ${msg.data?.first_name || msg.data?.email || msg.data?.id}`;
                break;
              case 'categories':
                title = '新分类';
                notificationText = `添加了新分类: ${msg.data?.name || msg.data?.id}`;
                break;
              case 'terminals':
                title = '新终端';
                notificationText = `新终端接入: ${msg.data?.name || msg.data?.id}`;
                break;
              case 'views':
                title = '新视图';
                notificationText = `创建了新视图: ${msg.data?.name || msg.data?.id}`;
                break;
              case 'visits':
                title = '新访问';
                notificationText = `记录了新的访问: ${msg.data?.id}`;
                break;
              default:
                title = '新记录';
                notificationText = `在 ${msg.collection} 中创建了新记录`;
            }
            
            // 创建新记录通知
            const notification: Notification = {
              id: `${Date.now()}-${Math.random()}`,
              title,
              message: notificationText,
              type: notificationType,
              timestamp: new Date().toISOString(),
              read: false,
              data: { collection: msg.collection, event: msg.event, item: msg.data }
            };
            setNotifications(prev => [notification, ...prev.slice(0, 99)]);
            setUnreadCount(prev => prev + 1);
            message.success(`${title}: ${notificationText}`);
          } else if (msg.event === 'update') {
            console.log('WebSocket: 更新记录', msg.collection, msg.data);
            
            // 根据不同实体类型生成更新通知
            let title = '记录更新';
            let updateText = '';
            let notificationType: 'info' | 'success' | 'warning' | 'error' = 'info';
            
            switch (msg.collection) {
              case 'orders':
                title = '订单更新';
                updateText = `订单 #${msg.data?.id} 已更新`;
                break;
              case 'customers':
                title = '客户更新';
                updateText = `客户 ${msg.data?.nick_name || msg.data?.name || msg.data?.id} 信息已更新`;
                break;
              case 'products':
                title = '产品更新';
                updateText = `产品 ${msg.data?.name || msg.data?.id} 已更新`;
                break;
              case 'boutiques':
                title = '店铺更新';
                updateText = `店铺 ${msg.data?.name || msg.data?.id} 信息已更新`;
                break;
              case 'directus_users':
                title = '用户更新';
                updateText = `用户 ${msg.data?.first_name || msg.data?.email || msg.data?.id} 信息已更新`;
                break;
              case 'categories':
                title = '分类更新';
                updateText = `分类 ${msg.data?.name || msg.data?.id} 已更新`;
                break;
              case 'terminals':
                title = '终端更新';
                updateText = `终端 ${msg.data?.name || msg.data?.id} 已更新`;
                break;
              case 'views':
                title = '视图更新';
                updateText = `视图 ${msg.data?.name || msg.data?.id} 已更新`;
                break;
              case 'visits':
                title = '访问更新';
                updateText = `访问记录 ${msg.data?.id} 已更新`;
                break;
              default:
                title = '记录更新';
                updateText = `${msg.collection} 中的记录已更新`;
            }
            
            // 更新记录通知
            const notification: Notification = {
              id: `${Date.now()}-${Math.random()}`,
              title,
              message: updateText,
              type: notificationType,
              timestamp: new Date().toISOString(),
              read: false,
              data: { collection: msg.collection, event: msg.event, item: msg.data }
            };
            setNotifications(prev => [notification, ...prev.slice(0, 99)]);
            setUnreadCount(prev => prev + 1);
            message.info(`${title}: ${updateText}`);
          } else if (msg.event === 'delete') {
            console.log('WebSocket: 删除记录', msg.collection, msg.data);
            
            // 根据不同实体类型生成删除通知
            let title = '记录删除';
            let deleteText = '';
            let notificationType: 'info' | 'success' | 'warning' | 'error' = 'warning';
            
            switch (msg.collection) {
              case 'orders':
                title = '订单删除';
                deleteText = `订单 #${msg.data?.id} 已被删除`;
                break;
              case 'customers':
                title = '客户删除';
                deleteText = `客户 ${msg.data?.nick_name || msg.data?.name || msg.data?.id} 已被删除`;
                break;
              case 'products':
                title = '产品删除';
                deleteText = `产品 ${msg.data?.name || msg.data?.id} 已被删除`;
                break;
              case 'boutiques':
                title = '店铺删除';
                deleteText = `店铺 ${msg.data?.name || msg.data?.id} 已被删除`;
                break;
              case 'directus_users':
                title = '用户删除';
                deleteText = `用户 ${msg.data?.first_name || msg.data?.email || msg.data?.id} 已被删除`;
                break;
              case 'categories':
                title = '分类删除';
                deleteText = `分类 ${msg.data?.name || msg.data?.id} 已被删除`;
                break;
              case 'terminals':
                title = '终端删除';
                deleteText = `终端 ${msg.data?.name || msg.data?.id} 已被删除`;
                break;
              case 'views':
                title = '视图删除';
                deleteText = `视图 ${msg.data?.name || msg.data?.id} 已被删除`;
                break;
              case 'visits':
                title = '访问删除';
                deleteText = `访问记录 ${msg.data?.id} 已被删除`;
                break;
              default:
                title = '记录删除';
                deleteText = `${msg.collection} 中的记录已被删除`;
            }
            
            // 删除记录通知
            const notification: Notification = {
              id: `${Date.now()}-${Math.random()}`,
              title,
              message: deleteText,
              type: notificationType,
              timestamp: new Date().toISOString(),
              read: false,
              data: { collection: msg.collection, event: msg.event, item: msg.data }
            };
            setNotifications(prev => [notification, ...prev.slice(0, 99)]);
            setUnreadCount(prev => prev + 1);
            message.warning(`${title}: ${deleteText}`);
          }
        } else if (msg.type === 'heartbeat') {
          console.log('WebSocket: 心跳');
        }
      } catch (error) {
        console.error('WebSocket消息错误:', error);
      }
    };

    ws.onclose = (event) => {
      console.log(`WebSocket: 连接关闭 [${event.code}] ${event.reason}`);
      setConnected(false);
      wsRef.current = null;
      
      // 如果不是手动关闭且用户已登录，5秒后重连
      if (event.code !== 1000 && user) {
        console.log('WebSocket: 5秒后尝试重连');
        setTimeout(() => {
          if (user && !wsRef.current) {
            console.log('WebSocket: 开始重连');
            connectWs();
          }
        }, 5000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      setConnected(false);
      setLoading(false);
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