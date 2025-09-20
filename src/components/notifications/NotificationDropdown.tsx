'use client';

import React from 'react';
import { Badge, Button, Dropdown, List, Typography, Space, Divider, Empty } from 'antd';
import { BellOutlined, DeleteOutlined, ReloadOutlined, WifiOutlined, DisconnectOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useNotifications } from '@hooks/useNotifications';

const { Text } = Typography;

export function NotificationDropdown() {
  const {
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
  } = useNotifications();

  const handleNotificationClick = (id: string, read: boolean) => {
    if (!read) {
      markAsRead(id);
    }
  };

  const connectionStatusIcon = () => {
    if (loading) {
      return <ReloadOutlined spin style={{ color: '#1890ff' }} />;
    }
    if (connected) {
      return <WifiOutlined style={{ color: '#52c41a' }} />;
    }
    return <DisconnectOutlined style={{ color: '#ff4d4f' }} />;
  };

  const connectionStatusText = () => {
    if (loading) {
      return `连接中... ${connectionAttempts > 0 ? `(第${connectionAttempts}次尝试)` : ''}`;
    }
    if (connected) {
      return 'WebSocket 已连接';
    }
    return 'WebSocket 未连接';
  };

  const dropdownContent = (
    <div style={{ width: 380, maxHeight: 500, overflow: 'hidden' }}>
      {/* 连接状态栏 */}
      <div style={{ padding: '12px 16px', backgroundColor: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          {connectionStatusIcon()}
          <Text style={{ fontSize: '12px', color: '#666' }}>
            {connectionStatusText()}
          </Text>
          {!connected && !loading && (
            <Button size="small" type="link" onClick={connect}>
              重连
            </Button>
          )}
          {connected && (
            <Button size="small" type="link" danger onClick={disconnect}>
              断开
            </Button>
          )}
        </Space>
      </div>

      {/* 通知标题栏 */}
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>通知 ({notifications.length})</Text>
        <Space>
          {unreadCount > 0 && (
            <Button type="link" size="small" onClick={markAllAsRead}>
              全部已读
            </Button>
          )}
          <Button
            type="link" 
            size="small" 
            icon={<ReloadOutlined />}
            onClick={refresh}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Divider style={{ margin: 0 }} />

      {/* 通知列表 */}
      <div style={{ maxHeight: 350, overflow: 'auto' }}>
        {notifications.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
            description="暂无通知" 
            style={{ padding: '40px 20px' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                key={notification.id}
                style={{
                  padding: '12px 16px',
                  backgroundColor: notification.read ? 'transparent' : '#f6ffed',
                  borderLeft: notification.read ? 'none' : '3px solid #52c41a',
                  cursor: 'pointer'
                }}
                onClick={() => handleNotificationClick(notification.id, notification.read)}
                actions={[
                  <Button
                    key="delete"
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    style={{ color: '#999' }}
                  />
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong={!notification.read} style={{ fontSize: '14px' }}>
                        {notification.title}
                      </Text>
                      {!notification.read && (
                        <Badge status="processing" />
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <Text style={{ fontSize: '12px', color: '#666' }}>
                        {notification.message}
                      </Text>
                      <br />
                      <Text style={{ fontSize: '11px', color: '#999' }}>
                        {new Date(notification.timestamp).toLocaleString('zh-CN')}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  const menuItems: MenuProps['items'] = [
    {
      key: 'notifications',
      label: dropdownContent,
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={['click']}
      overlayClassName="notification-dropdown"
      overlayStyle={{ 
        boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
        borderRadius: '8px'
      }}
    >
      <Badge count={unreadCount} size="small">
        <Button
          type="text"
          icon={<BellOutlined />}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40
          }}
        />
      </Badge>
    </Dropdown>
  );
}