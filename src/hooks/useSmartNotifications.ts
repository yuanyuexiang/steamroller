/**
 * 智能通知系统 - WebSocket + 轮询降级
 * 优先使用WebSocket，连接失败时自动降级到轮询
 */

import { useEffect, useState } from 'react';
import { useNotifications } from './useNotifications';
import { usePollingNotifications } from './usePollingNotifications';

export function useSmartNotifications() {
  const [mode, setMode] = useState<'websocket' | 'polling' | 'disabled'>('websocket');
  
  // WebSocket通知
  const websocketNotifications = useNotifications();
  
  // 轮询通知（只在WebSocket失败时启用）
  const pollingNotifications = usePollingNotifications({
    enabled: mode === 'polling',
    interval: 15000, // 15秒轮询间隔
    collections: ['orders', 'customers', 'products', 'boutiques']
  });

  // 监听WebSocket连接状态，自动切换模式
  useEffect(() => {
    let connectionCheckTimeout: NodeJS.Timeout;
    
    // 给WebSocket 10秒时间尝试连接
    connectionCheckTimeout = setTimeout(() => {
      if (!websocketNotifications.connected && !websocketNotifications.loading) {
        console.log('WebSocket连接失败，切换到轮询模式');
        setMode('polling');
      }
    }, 10000);

    // 如果WebSocket成功连接，使用WebSocket模式
    if (websocketNotifications.connected) {
      console.log('WebSocket连接成功');
      setMode('websocket');
      clearTimeout(connectionCheckTimeout);
    }

    return () => {
      clearTimeout(connectionCheckTimeout);
    };
  }, [websocketNotifications.connected, websocketNotifications.loading]);

  // 根据当前模式返回对应的通知系统
  const activeNotifications = mode === 'websocket' ? websocketNotifications : pollingNotifications;

  return {
    ...activeNotifications,
    mode,
    switchToWebSocket: () => {
      setMode('websocket');
      websocketNotifications.connect();
    },
    switchToPolling: () => {
      setMode('polling');
      websocketNotifications.disconnect();
    },
    // 额外的状态信息
    websocketConnected: websocketNotifications.connected,
    pollingActive: pollingNotifications.isPolling
  };
}