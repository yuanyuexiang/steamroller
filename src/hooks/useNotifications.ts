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
            
            // 订阅所有重要实体的事件
            const collections = ['boutiques', 'categories', 'customers', 'orders', 'products', 'terminals', 'views', 'visits'];
            const events = ['create', 'update', 'delete'];
            
            console.log(`=== 准备订阅 ${collections.length} 个实体，每个 ${events.length} 种事件 ===`);
            
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
            
            console.log('=== 所有订阅请求已发送 ===');
          } else {
            console.error('=== WebSocket: 认证失败 ===', msg);
            ws.close();
          }
        } else if (msg.type === 'subscription') {
          // 处理数据结构：data 可能是数组或对象
          const actualData = Array.isArray(msg.data) ? msg.data[0] : msg.data;
          
          console.log('WebSocket: 收到订阅消息==========================================', {
            type: msg.type,
            event: msg.event,
            collection: msg.collection,
            rawData: msg.data,
            actualData: actualData,
            dataId: actualData?.id,
            dataKeys: actualData ? Object.keys(actualData) : []
          });
          
          // 根据数据字段推断实体类型（如果没有 collection 字段）
          let collectionName = msg.collection;
          if (!collectionName && actualData) {
            // 根据数据特征推断实体类型
            if (actualData.name && actualData.address && actualData.contact) {
              collectionName = 'boutiques';
            } else if (actualData.nick_name || actualData.customer_id) {
              collectionName = 'customers';
            } else if (actualData.product_name || actualData.price) {
              collectionName = 'products';
            } else if (actualData.order_number || actualData.total_amount) {
              collectionName = 'orders';
            } else if (actualData.first_name || actualData.email) {
              collectionName = 'directus_users';
            } else if (actualData.category_name) {
              collectionName = 'categories';
            } else if (actualData.terminal_id) {
              collectionName = 'terminals';
            } else if (actualData.view_name) {
              collectionName = 'views';
            } else if (actualData.visit_time) {
              collectionName = 'visits';
            }
          }
          
          if (msg.event === 'create') {
            console.log('WebSocket: 新建记录', collectionName, actualData);
            
            // 根据不同实体类型生成通知
            let title = '新记录';
            let notificationText = '';
            let notificationType: 'info' | 'success' | 'warning' | 'error' = 'success';
            
            switch (collectionName) {
              case 'orders':
                title = '新订单';
                notificationText = `收到新的订单 #${actualData?.id}`;
                break;
              case 'customers':
                title = '新客户';
                notificationText = `新客户注册: ${actualData?.nick_name || actualData?.name || actualData?.id}`;
                break;
              case 'products':
                title = '新产品';
                notificationText = `添加了新产品: ${actualData?.name || actualData?.id}`;
                break;
              case 'boutiques':
                title = '新店铺';
                notificationText = `新店铺开业: ${actualData?.name || actualData?.id}`;
                break;
              case 'directus_users':
                title = '新用户';
                notificationText = `新用户加入: ${actualData?.first_name || actualData?.email || actualData?.id}`;
                break;
              case 'categories':
                title = '新分类';
                notificationText = `添加了新分类: ${actualData?.name || actualData?.id}`;
                break;
              case 'terminals':
                title = '新终端';
                notificationText = `新终端接入: ${actualData?.name || actualData?.id}`;
                break;
              case 'views':
                title = '新视图';
                notificationText = `创建了新视图: ${actualData?.name || actualData?.id}`;
                break;
              case 'visits':
                title = '新访问';
                notificationText = `记录了新的访问: ${actualData?.id}`;
                break;
              default:
                title = '新记录';
                notificationText = `在 ${collectionName || '未知实体'} 中创建了新记录${actualData?.id ? ` ID: ${actualData.id}` : ''}`;
            }
            
            // 创建新记录通知
            const notification: Notification = {
              id: `${Date.now()}-${Math.random()}`,
              title,
              message: notificationText,
              type: notificationType,
              timestamp: new Date().toISOString(),
              read: false,
              data: { collection: collectionName, event: msg.event, item: actualData }
            };
            setNotifications(prev => [notification, ...prev.slice(0, 99)]);
            setUnreadCount(prev => prev + 1);
            message.success(`${title}: ${notificationText}`);
          } else if (msg.event === 'update') {
            console.log('WebSocket: 更新记录', {
              collection: collectionName,
              dataId: actualData?.id,
              data: actualData
            });
            
            // 根据不同实体类型生成更新通知
            let title = '记录更新';
            let updateText = '';
            let notificationType: 'info' | 'success' | 'warning' | 'error' = 'info';
            
            console.log('WebSocket: 订阅================', {
              originalMsg: msg,
              collectionName,
              actualData
            });
            switch (collectionName) {
              case 'orders':
                title = '订单更新';
                updateText = `订单 #${actualData?.id} 已更新`;
                break;
              case 'customers':
                title = '客户更新';
                updateText = `客户 ${actualData?.nick_name || actualData?.name || actualData?.id} 信息已更新`;
                break;
              case 'products':
                title = '产品更新';
                updateText = `产品 ${actualData?.name || actualData?.id} 已更新`;
                break;
              case 'boutiques':
                title = '店铺更新';
                updateText = `店铺 ${actualData?.name || actualData?.id} 信息已更新`;
                break;
              case 'directus_users':
                title = '用户更新';
                updateText = `用户 ${actualData?.first_name || actualData?.email || actualData?.id} 信息已更新`;
                break;
              case 'categories':
                title = '分类更新';
                updateText = `分类 ${actualData?.name || actualData?.id} 已更新`;
                break;
              case 'terminals':
                title = '终端更新';
                updateText = `终端 ${actualData?.name || actualData?.id} 已更新`;
                break;
              case 'views':
                title = '视图更新';
                updateText = `视图 ${actualData?.name || actualData?.id} 已更新`;
                break;
              case 'visits':
                title = '访问更新';
                updateText = `访问记录 ${actualData?.id} 已更新`;
                break;
              default:
                title = '记录更新';
                updateText = `${collectionName || '未知实体'} 中的记录已更新${actualData?.id ? ` (ID: ${actualData.id})` : ''}`;
            }
            
            // 更新记录通知
            const notification: Notification = {
              id: `${Date.now()}-${Math.random()}`,
              title,
              message: updateText,
              type: notificationType,
              timestamp: new Date().toISOString(),
              read: false,
              data: { collection: collectionName, event: msg.event, item: actualData }
            };
            setNotifications(prev => [notification, ...prev.slice(0, 99)]);
            setUnreadCount(prev => prev + 1);
            message.info(`${title}: ${updateText}`);
          } else if (msg.event === 'delete') {
            console.log('WebSocket: 删除记录', {
              collection: collectionName,
              dataId: actualData?.id,
              data: actualData
            });
            
            // 根据不同实体类型生成删除通知
            let title = '记录删除';
            let deleteText = '';
            let notificationType: 'info' | 'success' | 'warning' | 'error' = 'warning';
            
            switch (collectionName) {
              case 'orders':
                title = '订单删除';
                deleteText = `订单 #${actualData?.id} 已被删除`;
                break;
              case 'customers':
                title = '客户删除';
                deleteText = `客户 ${actualData?.nick_name || actualData?.name || actualData?.id} 已被删除`;
                break;
              case 'products':
                title = '产品删除';
                deleteText = `产品 ${actualData?.name || actualData?.id} 已被删除`;
                break;
              case 'boutiques':
                title = '店铺删除';
                deleteText = `店铺 ${actualData?.name || actualData?.id} 已被删除`;
                break;
              case 'directus_users':
                title = '用户删除';
                deleteText = `用户 ${actualData?.first_name || actualData?.email || actualData?.id} 已被删除`;
                break;
              case 'categories':
                title = '分类删除';
                deleteText = `分类 ${actualData?.name || actualData?.id} 已被删除`;
                break;
              case 'terminals':
                title = '终端删除';
                deleteText = `终端 ${actualData?.name || actualData?.id} 已被删除`;
                break;
              case 'views':
                title = '视图删除';
                deleteText = `视图 ${actualData?.name || actualData?.id} 已被删除`;
                break;
              case 'visits':
                title = '访问删除';
                deleteText = `访问记录 ${actualData?.id} 已被删除`;
                break;
              default:
                title = '记录删除';
                deleteText = `${collectionName || '未知实体'} 中的记录已被删除${actualData?.id ? ` (ID: ${actualData.id})` : ''}`;
            }
            
            // 删除记录通知
            const notification: Notification = {
              id: `${Date.now()}-${Math.random()}`,
              title,
              message: deleteText,
              type: notificationType,
              timestamp: new Date().toISOString(),
              read: false,
              data: { collection: collectionName, event: msg.event, item: actualData }
            };
            setNotifications(prev => [notification, ...prev.slice(0, 99)]);
            setUnreadCount(prev => prev + 1);
            message.warning(`${title}: ${deleteText}`);
          }
        } else if (msg.type === 'heartbeat') {
          // 忽略心跳消息
        } else {
          console.log('WebSocket: 未处理的消息类型', msg.type);
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
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
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