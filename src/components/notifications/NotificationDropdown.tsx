'use client';

import React, { useState } from 'react';
import { 
  Dropdown, 
  List, 
  Avatar, 
  Typography, 
  Button, 
  Space, 
  Divider,
  Empty,
  Badge,
  Tag,
  Tooltip
} from 'antd';
import { 
  BellOutlined,
  DeleteOutlined,
  CheckOutlined,
  ClearOutlined,
  WifiOutlined,
  DisconnectOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { Notification } from '@types';
import { useSmartNotifications } from '@hooks/useSmartNotifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Title } = Typography;

// 全局样式注入
if (typeof document !== 'undefined') {
  const notificationStyles = `
    .notification-item {
      border-radius: 8px !important;
      margin-bottom: 4px !important;
      transition: all 0.2s ease !important;
    }
    
    .notification-item:hover {
      background: #f8f9ff !important;
      transform: translateX(2px) !important;
    }
    
    .notification-item.unread {
      background: #f6f8ff !important;
      border-left: 3px solid #1890ff !important;
    }
    
    .admin-header-notification {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
      border: 1px solid #e6ebff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #667eea;
      margin-right: 16px;
    }
    
    .admin-header-notification:hover {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
  `;
  
  const styleElement = document.createElement('style');
  styleElement.innerHTML = notificationStyles;
  if (!document.head.querySelector('style[data-notification-styles]')) {
    styleElement.setAttribute('data-notification-styles', 'true');
    document.head.appendChild(styleElement);
  }
}

// 通知类型对应的图标和颜色
const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'order':
      return <ShoppingCartOutlined style={{ color: '#1890ff' }} />;
    case 'system':
      return <SettingOutlined style={{ color: '#722ed1' }} />;
    case 'success':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'warning':
      return <WarningOutlined style={{ color: '#faad14' }} />;
    case 'error':
      return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    default:
      return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
  }
};

// 通知类型标签颜色
const getNotificationTagColor = (type: Notification['type']) => {
  switch (type) {
    case 'order': return 'blue';
    case 'system': return 'purple';
    case 'success': return 'green';
    case 'warning': return 'orange';
    case 'error': return 'red';
    default: return 'default';
  }
};

// 通知类型显示文本
const getNotificationTypeText = (type: Notification['type']) => {
  switch (type) {
    case 'order': return '订单';
    case 'system': return '系统';
    case 'success': return '成功';
    case 'warning': return '警告';
    case 'error': return '错误';
    default: return '消息';
  }
};

export interface NotificationDropdownProps {
  className?: string;
}

export default function NotificationDropdown({ className }: NotificationDropdownProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    connected,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    mode,
    websocketConnected,
    pollingActive,
    switchToWebSocket,
    switchToPolling
  } = useSmartNotifications();  // 处理通知点击
  const handleNotificationClick = (notification: Notification) => {
    // 标记为已读
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // 执行动作
    if (notification.action) {
      if (notification.action.type === 'navigate') {
        setDropdownOpen(false);
        router.push(notification.action.url);
      } else if (notification.action.type === 'external') {
        window.open(notification.action.url, '_blank');
      }
    }
  };

  // 处理删除通知
  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  // 渲染单个通知项
  const renderNotificationItem = (notification: Notification) => (
    <List.Item
      key={notification.id}
      onClick={() => handleNotificationClick(notification)}
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        background: notification.read ? 'transparent' : '#f6f8ff',
        borderLeft: notification.read ? '3px solid transparent' : '3px solid #1890ff',
        transition: 'all 0.2s',
      }}
      className="notification-item"
    >
      <List.Item.Meta
        avatar={
          <Avatar 
            icon={getNotificationIcon(notification.type)}
            size={40}
            style={{ 
              backgroundColor: 'transparent',
              border: '1px solid #f0f0f0'
            }}
          />
        }
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <Text 
                strong={!notification.read}
                style={{ 
                  fontSize: '14px',
                  color: notification.read ? '#8c8c8c' : '#262626'
                }}
              >
                {notification.title}
              </Text>
              <Tag 
                color={getNotificationTagColor(notification.type)}
              >
                {getNotificationTypeText(notification.type)}
              </Tag>
            </div>
            <Space size="small">
              {notification.action && (
                <Tooltip title="查看详情">
                  <RightOutlined 
                    style={{ 
                      fontSize: '12px', 
                      color: '#8c8c8c',
                      opacity: 0.6
                    }} 
                  />
                </Tooltip>
              )}
              <Tooltip title="删除通知">
                <DeleteOutlined 
                  onClick={(e) => handleDeleteNotification(e, notification.id)}
                  style={{ 
                    fontSize: '12px', 
                    color: '#ff4d4f',
                    opacity: 0.6,
                    cursor: 'pointer'
                  }}
                />
              </Tooltip>
            </Space>
          </div>
        }
        description={
          <div>
            <Text 
              style={{ 
                fontSize: '13px', 
                color: notification.read ? '#bfbfbf' : '#595959',
                lineHeight: '1.4',
                display: 'block',
                marginBottom: '4px'
              }}
            >
              {notification.message}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text 
                style={{ 
                  fontSize: '12px', 
                  color: '#bfbfbf'
                }}
              >
                <ClockCircleOutlined style={{ marginRight: '4px' }} />
                {dayjs(notification.timestamp).fromNow()}
              </Text>
              {notification.action && (
                <Text 
                  style={{ 
                    fontSize: '12px', 
                    color: '#1890ff',
                    cursor: 'pointer'
                  }}
                >
                  {notification.action.label}
                </Text>
              )}
            </div>
          </div>
        }
      />
    </List.Item>
  );

  // 创建下拉内容
  const dropdownContent = (
    <div style={{ 
      width: 380, 
      maxHeight: 600, 
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
      {/* 头部 */}
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BellOutlined />
          通知中心
          {unreadCount > 0 && (
            <Badge 
              count={unreadCount} 
              size="small"
              style={{ marginLeft: '4px' }}
            />
          )}
          {/* 连接状态指示器 */}
          <Tooltip title={
            mode === 'websocket' 
              ? (websocketConnected ? 'WebSocket已连接' : 'WebSocket连接中...')
              : 'HTTP轮询模式'
          }>
            {mode === 'websocket' ? (
              websocketConnected ? (
                <WifiOutlined style={{ color: '#52c41a', fontSize: '14px' }} />
              ) : (
                <SyncOutlined spin style={{ color: '#faad14', fontSize: '14px' }} />
              )
            ) : (
              <DisconnectOutlined style={{ color: '#ff4d4f', fontSize: '14px' }} />
            )}
          </Tooltip>
        </Title>
        <Tooltip 
          title={
            mode === 'websocket' && !websocketConnected
              ? '连接失败，点击切换到轮询模式'
              : mode === 'polling' 
              ? '点击切换到WebSocket模式'
              : 'WebSocket连接正常'
          }
        >
          {mode === 'websocket' && !websocketConnected && (
            <Button 
              type="text" 
              size="small" 
              icon={<DisconnectOutlined />}
              onClick={switchToPolling}
              style={{ color: '#ff4d4f' }}
            >
              切换到轮询
            </Button>
          )}
          {mode === 'polling' && (
            <Button 
              type="text" 
              size="small" 
              icon={<WifiOutlined />}
              onClick={switchToWebSocket}
              style={{ color: '#1890ff' }}
            >
              重试WebSocket
            </Button>
          )}
        </Tooltip>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Tooltip title={connected ? 'WebSocket已连接' : 'WebSocket未连接'}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#52c41a' : '#ff4d4f',
              marginRight: '8px'
            }} />
          </Tooltip>
          {notifications.length > 0 && (
            <Space size="small">
              {unreadCount > 0 && (
                <Button 
                  type="text" 
                  size="small"
                  icon={<CheckOutlined />}
                  onClick={markAllAsRead}
                >
                  全部已读
                </Button>
              )}
              <Button 
                type="text" 
                size="small"
                danger
                onClick={clearAll}
              >
                清空
              </Button>
            </Space>
          )}
        </div>
      </div>

      {/* 通知列表 */}
      <div style={{ 
        maxHeight: 480, 
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Text>加载中...</Text>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '40px' }}>
            <Empty 
              description="暂无通知"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <List
            dataSource={notifications}
            renderItem={renderNotificationItem}
            split={false}
            style={{ padding: '0' }}
          />
        )}
      </div>

      {/* 底部 */}
      {notifications.length > 0 && (
        <>
          <Divider style={{ margin: 0 }} />
          <div style={{ padding: '12px 16px', textAlign: 'center' }}>
            <Button 
              type="link" 
              size="small"
              onClick={() => {
                setDropdownOpen(false);
                // TODO: 导航到通知中心页面
                console.log('导航到通知中心');
              }}
            >
              查看全部通知
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      open={dropdownOpen}
      onOpenChange={setDropdownOpen}
      placement="bottomRight"
      className={className}
    >
      <div className="admin-header-notification">
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <BellOutlined />
        </Badge>
      </div>
    </Dropdown>
  );
}