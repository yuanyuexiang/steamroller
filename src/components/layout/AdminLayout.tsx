'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Typography } from 'antd';
import {
  DashboardOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  TeamOutlined,
  EyeOutlined,
  BarChartOutlined,
  DesktopOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@providers/AuthProvider';
import { NotificationDropdown } from '@components/notifications';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

// 全局样式
const globalStyles = `
.admin-layout-container {
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.admin-sidebar {
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%) !important;
  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.1);
  border-right: none !important;
}

.admin-sidebar-logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  margin: 0;
  position: relative;
  overflow: hidden;
}

.admin-sidebar-logo::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%);
  pointer-events: none;
}

.admin-sidebar-logo h4 {
  color: white !important;
  margin: 0;
  font-weight: 700;
  font-size: 18px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
  letter-spacing: 1px;
}

.admin-menu {
  background: transparent !important;
  border-right: none !important;
  margin-top: 16px;
  padding: 0 12px;
}

.admin-menu .ant-menu-item {
  background: transparent !important;
  border-radius: 12px !important;
  margin: 4px 0 !important;
  height: 48px !important;
  line-height: 48px !important;
  color: rgba(255, 255, 255, 0.8) !important;
  border: none !important;
  transition: all 0.3s ease !important;
}

.admin-menu .ant-menu-item:hover {
  background: rgba(255, 255, 255, 0.15) !important;
  color: white !important;
  transform: translateX(4px);
}

.admin-menu .ant-menu-item-selected {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.admin-menu .ant-menu-item-selected::after {
  display: none !important;
}

.admin-menu .ant-menu-item .anticon {
  font-size: 16px;
  margin-right: 12px;
}

.admin-header {
  background: white !important;
  border-bottom: 1px solid #f0f0f0 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
  padding: 0 24px !important;
  height: 64px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

.admin-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.admin-header-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-header-title-main {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #262626 !important;
  line-height: 1.2 !important;
  margin: 0 !important;
}

.admin-header-title-desc {
  font-size: 12px !important;
  color: #8c8c8c !important;
  line-height: 1.2 !important;
  margin: 0 !important;
  display: block !important;
}

.admin-header-toggle {
  width: 40px !important;
  height: 40px !important;
  border-radius: 8px !important;
  border: 1px solid #d9d9d9 !important;
  background: white !important;
  color: #667eea !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.2s ease !important;
}

.admin-header-toggle:hover {
  background: #f8f9ff !important;
  border-color: #667eea !important;
  transform: scale(1.05) !important;
}

.admin-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.admin-header-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
  border: 1px solid #e6ebff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.admin-header-user:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.admin-header-user:hover .admin-header-user-info {
  color: white;
}

.admin-header-user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.admin-header-user-info h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  line-height: 1.2;
}

.admin-header-user-info p {
  margin: 0;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.2;
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
}

.admin-header-notification:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.admin-content {
  height: calc(100vh - 64px);
  overflow-y: auto;
  background: transparent;
  padding: 0;
}

.admin-content::-webkit-scrollbar {
  width: 6px;
}

.admin-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.admin-content::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
}

.admin-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = globalStyles;
  if (!document.head.querySelector('style[data-admin-layout]')) {
    styleElement.setAttribute('data-admin-layout', 'true');
    document.head.appendChild(styleElement);
  }
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // 初始化时从 localStorage 读取侧边栏状态
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed !== null) {
      setCollapsed(JSON.parse(savedCollapsed));
    }
  }, []);

  // 切换侧边栏状态并保存到 localStorage
  const toggleCollapsed = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newCollapsed));
  };

  // 根据当前路径确定选中的菜单项
  const getSelectedKey = () => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname.startsWith('/boutiques')) return 'boutiques';
    if (pathname.startsWith('/orders')) return 'orders';
    if (pathname.startsWith('/terminals')) return 'terminals';
    if (pathname.startsWith('/users')) return 'users';
    if (pathname.startsWith('/customers')) return 'customers';
    if (pathname.startsWith('/views')) return 'views';
    if (pathname.startsWith('/visits')) return 'visits';
    if (pathname.startsWith('/profile')) return 'profile';
    return 'dashboard';
  };

  // 获取页面标题
  const getPageTitle = () => {
    const key = getSelectedKey();
    const titleMap = {
      'dashboard': '数据总览',
      'users': '用户管理',
      'boutiques': '店铺管理',
      'orders': '订单管理',
      'terminals': '终端管理',
      'customers': '客户管理',
      'views': '浏览分析',
      'visits': '访问统计',
      'profile': '个人资料'
    };
    return titleMap[key as keyof typeof titleMap] || '管理后台';
  };

  // 获取页面描述
  const getPageDescription = () => {
    const key = getSelectedKey();
    const descriptionMap = {
      'dashboard': '查看系统概况和关键指标',
      'boutiques': '管理店铺信息和运营状态',
      'orders': '处理订单和交易记录',
      'customers': '管理客户信息和关系维护',
      'views': '分析产品浏览行为和热度',
      'visits': '统计店铺访问数据和趋势',
      'terminals': '管理终端设备和配置',
      'users': '管理系统用户和权限',
      'profile': '管理个人账户和设置'
    };
    return descriptionMap[key as keyof typeof descriptionMap] || '欢迎使用管理系统';
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '数据总览',
      onClick: () => router.push('/dashboard'),
    },
    {
      key: 'boutiques',
      icon: <ShopOutlined />,
      label: '店铺管理',
      onClick: () => router.push('/boutiques'),
    },
    {
      key: 'orders',
      icon: <ShoppingCartOutlined />,
      label: '订单管理',
      onClick: () => router.push('/orders'),
    },
    {
      key: 'customers',
      icon: <TeamOutlined />,
      label: '客户管理',
      onClick: () => router.push('/customers'),
    },
    {
      key: 'views',
      icon: <EyeOutlined />,
      label: '浏览分析',
      onClick: () => router.push('/views'),
    },
    {
      key: 'visits',
      icon: <BarChartOutlined />,
      label: '访问统计',
      onClick: () => router.push('/visits'),
    },
    {
      key: 'terminals',
      icon: <DesktopOutlined />,
      label: '终端管理',
      onClick: () => router.push('/terminals'),
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: '用户管理',
      onClick: () => router.push('/users'),
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '账号详情',
      onClick: () => router.push('/profile'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout,
    },
  ];

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Layout className="admin-layout-container">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="admin-sidebar"
        width={260}
        collapsedWidth={80}
      >
        <div className="admin-sidebar-logo">
          <Title level={4}>
            {collapsed ? (
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                LX
              </div>
            ) : '==实体店产品展示系统=='}
          </Title>
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          className="admin-menu"
        />
      </Sider>
      
      <Layout>
        <Header className="admin-header">
          <div className="admin-header-left">
            <Button
              className="admin-header-toggle"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
            />
            
            <div className="admin-header-title">
              <Text className="admin-header-title-main">
                {getPageTitle()}
              </Text>
              <Text className="admin-header-title-desc">
                {getPageDescription()}
              </Text>
            </div>
          </div>

          <div className="admin-header-right">
            <NotificationDropdown />
            
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
              trigger={['click']}
            >
              <div className="admin-header-user">
                <Avatar 
                  icon={<UserOutlined />} 
                  size={32}
                  className="admin-header-user-avatar"
                />
                <div className="admin-header-user-info">
                  <h4> {user.last_name} {user.first_name}</h4>
                  <p>{user.email}</p>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        
        <Content className="admin-content">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
