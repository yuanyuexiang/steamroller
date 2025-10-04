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

  // 实体中文名称映射（简化版）
  const COLLECTION_NAMES = {
    boutiques: '店铺',
    customers: '客户',
    orders: '订单',
    products: '产品',
    categories: '分类',
    terminals: '终端',
    views: '视图',
    visits: '访问记录',
    directus_users: '用户',
    unknown: '未知实体' // 添加对未知实体的支持
  };

  // 统一的通知生成函数（简化版）
  const createNotification = (event: string, collection: string, data: any, uid?: string) => {
    console.log('=== createNotification 调试 ===', { event, collection, data, uid });
    
    // 获取中文实体名称，没有则使用英文首字母大写
    const entityName = COLLECTION_NAMES[collection as keyof typeof COLLECTION_NAMES] || 
                       (collection.charAt(0).toUpperCase() + collection.slice(1));
    
    // 统一获取ID，简化逻辑
    const itemId = data?.id || '未知ID';
    
    console.log('=== 简化解析 ===', {
      collection,
      entityName,
      itemId,
      hasCustomName: !!COLLECTION_NAMES[collection as keyof typeof COLLECTION_NAMES]
    });

    // 事件类型映射
    const eventMap = {
      create: { action: '新增', type: 'success' as const, verb: '创建' },
      update: { action: '更新', type: 'info' as const, verb: '更新' },
      delete: { action: '删除', type: 'warning' as const, verb: '删除' }
    };

    const eventInfo = eventMap[event as keyof typeof eventMap];
    if (!eventInfo) {
      console.warn(`未知事件类型: ${event}，使用默认配置`);
      // 为未知事件提供默认配置
      const title = `${entityName}变更`;
      const message = `${entityName} ID: ${itemId} 发生变更`;
      
      return {
        id: `${Date.now()}-${Math.random()}`,
        title,
        message,
        type: 'info' as const,
        timestamp: new Date().toISOString(),
        read: false,
        data: { collection, event, item: data, uid }
      };
    }

    // 统一的通知格式：实体名 + ID
    const title = `${entityName}${eventInfo.action}`;
    const message = `${entityName} ID: ${itemId} 已${eventInfo.verb}`;
    
    const notification = {
      id: `${Date.now()}-${Math.random()}`,
      title,
      message,
      type: eventInfo.type,
      timestamp: new Date().toISOString(),
      read: false,
      data: { collection, event, item: data, uid }
    };
    
    console.log('=== 生成的通知 ===', notification);
    return notification;
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
            
            // 订阅所有重要实体的事件（保持现有的已知实体）
            const knownCollections = ['boutiques', 'categories', 'customers', 'orders', 'products', 'terminals', 'views', 'visits'];
            const events = ['create', 'update', 'delete'];
            
            console.log(`=== 准备订阅 ${knownCollections.length} 个已知实体，每个 ${events.length} 种事件 ===`);
            
            // 订阅已知实体
            knownCollections.forEach(collection => {
              events.forEach(event => {
                const uid = `sub_${collection}_${event}_${Math.random().toString(36).substr(2, 9)}`;
                console.log(`WebSocket: 订阅已知实体 ${collection} ${event} 事件, UID: ${uid}`);
                
                ws.send(JSON.stringify({
                  type: 'subscribe',
                  collection: collection,
                  event: event,
                  uid: uid
                }));
                
                subscriptionsRef.current.add(uid);
              });
            });
            
            // 可选：订阅所有集合的变更（如果你想捕获任何新的实体类型）
            // 注意：这可能会产生大量通知，根据需要启用
            const enableWildcardSubscription = false; // 设置为 true 启用
            
            if (enableWildcardSubscription) {
              console.log('=== 启用通配符订阅，捕获所有实体变更 ===');
              events.forEach(event => {
                const uid = `sub_wildcard_${event}_${Math.random().toString(36).substr(2, 9)}`;
                console.log(`WebSocket: 订阅通配符 ${event} 事件, UID: ${uid}`);
                
                // 注意：这个语法可能需要根据 Directus 版本调整
                ws.send(JSON.stringify({
                  type: 'subscribe',
                  event: event, // 不指定 collection，订阅所有集合
                  uid: uid
                }));
                
                subscriptionsRef.current.add(uid);
              });
            }
            
            console.log('=== 所有订阅请求已发送 ===');
          } else {
            console.error('=== WebSocket: 认证失败 ===', msg);
            ws.close();
          }
        } else if (msg.type === 'subscription') {
          console.log('=== 收到完整的订阅消息 ===', JSON.stringify(msg, null, 2));
          
          // 过滤掉初始化事件，这些不需要显示通知
          if (msg.event === 'init') {
            console.log('WebSocket: 跳过初始化事件', msg.uid);
            return;
          }
          
          // 直接使用消息中的 collection 字段
          const collection = msg.collection;
          if (!collection) {
            console.warn('WebSocket: 收到没有 collection 字段的订阅消息', {
              fullMessage: msg,
              hasCollection: 'collection' in msg,
              collectionValue: msg.collection,
              allKeys: Object.keys(msg)
            });
            // 不要 return，继续尝试处理
          }

          if (!msg.event) {
            console.warn('WebSocket: 收到没有 event 字段的订阅消息', {
              fullMessage: msg,
              hasEvent: 'event' in msg,
              eventValue: msg.event,
              allKeys: Object.keys(msg)
            });
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
            dataKeys: actualData ? Object.keys(actualData) : [],
            hasCollection: !!collection
          });

          // 即使没有 collection 也尝试创建通知
          const finalCollection = collection || 'unknown';
          const notification = createNotification(msg.event, finalCollection, actualData, msg.uid);
          if (notification) {
            console.log('=== 添加通知到状态 ===', notification);
            setNotifications(prev => {
              const newNotifications = [notification, ...prev.slice(0, 99)];
              console.log('=== 更新后的通知列表 ===', newNotifications.length, '条通知');
              return newNotifications;
            });
            setUnreadCount(prev => {
              const newCount = prev + 1;
              console.log('=== 未读数量更新 ===', prev, '->', newCount);
              return newCount;
            });
            
            // 根据事件类型显示不同的消息
            const messageMethod = {
              'success': message.success,
              'info': message.info,
              'warning': message.warning,
              'error': message.error
            }[notification.type];
            
            console.log('=== 显示 Ant Design 消息 ===', notification.type, notification.title, notification.message);
            messageMethod(`${notification.title}: ${notification.message}`);
          } else {
            console.error('=== 通知创建失败 ===', { event: msg.event, collection: finalCollection, data: actualData });
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