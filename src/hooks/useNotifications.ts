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
  const subscriptionsRef = useRef<Set<string>>(new Set()); // 跟踪已创建的订阅 UID

  // 实体配置映射
  const COLLECTION_CONFIG = {
    boutiques: { name: '店铺', nameField: 'name', prefix: undefined },
    customers: { name: '客户', nameField: 'nick_name', prefix: undefined },
    orders: { name: '订单', nameField: 'id', prefix: '#' },
    products: { name: '产品', nameField: 'name', prefix: undefined },
    categories: { name: '分类', nameField: 'name', prefix: undefined },
    terminals: { name: '终端', nameField: 'name', prefix: undefined },
    views: { name: '视图', nameField: 'name', prefix: undefined },
    visits: { name: '访问记录', nameField: 'id', prefix: undefined },
    directus_users: { name: '用户', nameField: 'first_name', prefix: undefined }
  };

  // 统一的通知生成函数
  const createNotification = (event: string, collection: string, data: any, uid?: string) => {
    const config = COLLECTION_CONFIG[collection as keyof typeof COLLECTION_CONFIG];
    if (!config) {
      console.warn(`未知实体类型: ${collection}`, { event, data, uid });
      return null;
    }

    // 获取实体名称
    const itemName = data?.[config.nameField] || data?.name || data?.email || data?.id || '未知';
    const displayName = config.prefix ? `${config.prefix}${itemName}` : itemName;

    // 事件类型映射
    const eventMap = {
      create: { action: '新增', type: 'success' as const, verb: '创建' },
      update: { action: '更新', type: 'info' as const, verb: '更新' },
      delete: { action: '删除', type: 'warning' as const, verb: '删除' }
    };

    const eventInfo = eventMap[event as keyof typeof eventMap];
    if (!eventInfo) {
      console.warn(`未知事件类型: ${event}`);
      return null;
    }

    const title = `${config.name}${eventInfo.action}`;
    const message = `${config.name} ${displayName} 已${eventInfo.verb}`;

    return {
      id: `${Date.now()}-${Math.random()}`,
      title,
      message,
      type: eventInfo.type,
      timestamp: new Date().toISOString(),
      read: false,
      data: { collection, event, item: data, uid }
    };
  };

  // 极简连接函数 - 没有任何依赖
  const connectWs = async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: 已连接，跳过');
      return;
    }

    console.log('=== WebSocket: 开始创建连接 ===');
    setLoading(true);
    
    try {
      // 动态获取 WebSocket URL
      const response = await fetch('/api/websocket');
      const config = await response.json();
      
      if (!config.success || !config.wsUrl) {
        throw new Error('获取WebSocket配置失败');
      }
      
      console.log('=== WebSocket: 使用动态URL ===', config.wsUrl);
      const ws = new WebSocket(config.wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('=== WebSocket: 连接成功 ===');
        setConnected(true);
        setLoading(false);
        
        // 使用 TokenManager 获取有效认证令牌
        try {
          const { TokenManager } = await import('@lib/auth/token-manager');
          const token = await TokenManager.getValidToken();
          
          if (token) {
            console.log('=== WebSocket: 开始认证，token长度:', token.length, '===');
            // Directus WebSocket 认证格式
            ws.send(JSON.stringify({
              type: 'auth',
              access_token: token
            }));
          } else {
            console.error('=== WebSocket: 未找到有效令牌 ===');
            ws.close();
          }
        } catch (error) {
          console.error('=== WebSocket: 获取令牌失败 ===', error);
          ws.close();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          console.log('=== WebSocket: 收到消息 ===', msg.type, msg.event, msg);
        
        if (msg.type === 'auth') {
          if (msg.status === 'ok') {
            console.log('=== WebSocket: 认证成功，开始订阅 ===');
            
            // 清空之前的订阅记录
            subscriptionsRef.current.clear();
            
            // 订阅所有重要实体的事件
            const collections = ['boutiques', 'categories', 'customers', 'orders', 'products', 'terminals', 'views', 'visits'];
            const events = ['create', 'update', 'delete'];
            
            console.log(`=== 准备订阅 ${collections.length} 个实体，每个 ${events.length} 种事件 ===`);
            
            collections.forEach(collection => {
              events.forEach(event => {
                const uid = `sub_${collection}_${event}_${Math.random().toString(36).substr(2, 9)}`;
                console.log(`WebSocket: 订阅 ${collection} ${event} 事件, UID: ${uid}`);
                
                ws.send(JSON.stringify({
                  type: 'subscribe',
                  collection: collection,
                  event: event,
                  uid: uid
                }));
                
                subscriptionsRef.current.add(uid);
              });
            });
            
            console.log('=== 所有订阅请求已发送 ===');
          } else {
            console.error('=== WebSocket: 认证失败 ===', msg);
            ws.close();
          }
        } else if (msg.type === 'subscription') {
          // 直接使用消息中的 collection 字段
          const collection = msg.collection;
          if (!collection) {
            console.warn('WebSocket: 收到没有 collection 字段的订阅消息', msg);
            return;
          }

          if (!msg.event) {
            console.warn('WebSocket: 收到没有 event 字段的订阅消息', msg);
            return;
          }

          // 处理数据结构：data 可能是数组或对象
          const actualData = Array.isArray(msg.data) ? msg.data[0] : msg.data;
          
          console.log('WebSocket: 收到订阅消息', {
            type: msg.type,
            event: msg.event,
            collection: collection,
            uid: msg.uid,
            dataId: actualData?.id,
            dataKeys: actualData ? Object.keys(actualData) : []
          });

          // 统一处理所有事件类型
          const notification = createNotification(msg.event, collection, actualData, msg.uid);
          if (notification) {
            setNotifications(prev => [notification, ...prev.slice(0, 99)]);
            setUnreadCount(prev => prev + 1);
            
            // 根据事件类型显示不同的消息
            const messageMethod = {
              'success': message.success,
              'info': message.info,
              'warning': message.warning,
              'error': message.error
            }[notification.type];
            
            messageMethod(`${notification.title}: ${notification.message}`);
          }
        } else if (msg.type === 'ping') {
          // 响应心跳检查
          console.log('WebSocket: 收到 ping，回复 pong');
          ws.send(JSON.stringify({ type: 'pong' }));
        } else if (msg.type === 'heartbeat') {
          // 处理心跳消息 - 根据 Directus 文档，心跳可能是 ping/pong 机制
          console.log('WebSocket: 收到心跳消息');
          // 如果需要回复 pong，可以在这里处理
          // ws.send(JSON.stringify({ type: 'pong' }));
        } else {
          console.log('WebSocket: 未处理的消息类型', msg.type, msg);
        }
      } catch (error) {
        console.error('WebSocket: 解析消息错误', error, event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('=== WebSocket: 连接错误 ===', error);
      setConnected(false);
      setLoading(false);
    };

    ws.onclose = (event) => {
      console.log('=== WebSocket: 连接关闭 ===', event.code, event.reason);
      setConnected(false);
      setLoading(false);
      
      // 连接关闭时自动重连（避免无限循环）
      if (event.code !== 1000 && wsRef.current === ws) {
        console.log('=== WebSocket: 3秒后自动重连 ===');
        setTimeout(() => {
          if (wsRef.current === ws || wsRef.current === null) {
            connectWs();
          }
        }, 3000);
      }
    };
    
    } catch (error) {
      console.error('=== WebSocket: 获取配置失败 ===', error);
      setConnected(false);
      setLoading(false);
      
      // 配置获取失败时也要重连
      setTimeout(() => {
        connectWs();
      }, 5000);
    }
  };

  const disconnect = () => {
    console.log('WebSocket: 手动断开');
    
    // 取消所有订阅
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket: 取消所有订阅');
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe' })); // 取消所有订阅
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    subscriptionsRef.current.clear();
    setConnected(false);
  };

  // 初始化连接（仅用户登录时）
  useEffect(() => {
    console.log('=== useNotifications useEffect ===', { user: !!user, initRef: initRef.current });
    if (user && !initRef.current) {
      console.log('=== WebSocket: 用户登录，初始化连接 ===');
      initRef.current = true;
      connectWs();
    } else if (!user && initRef.current) {
      console.log('=== WebSocket: 用户注销，断开连接 ===');
      initRef.current = false;
      disconnect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === id);
      return notification && !notification.read ? Math.max(0, prev - 1) : prev;
    });
  };

  const refresh = async () => {
    setLoading(true);
    
    // 断开现有连接并重新连接
    disconnect();
    
    setTimeout(() => {
      connectWs();
    }, 1000);
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
    disconnect
  };
}