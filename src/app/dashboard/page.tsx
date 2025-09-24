'use client';

import React from 'react';
import { Typography, Spin, Button, Alert } from 'antd';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCartOutlined, 
  UserOutlined, 
  DashboardOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeInvisibleOutlined,
  ShopOutlined,
  TeamOutlined,
  EyeOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { ProtectedRoute, AdminLayout } from '@components';
import { 
  useGetDashboardDataQuery,
  useGetRecentOrdersQuery
} from '../../generated/graphql';
import { FILE_CONFIG } from '@lib/api';
import { IMAGE_CONFIGS } from '@config/image-configs';
import { getImageUrl } from '@config/image-utils';
import dayjs from 'dayjs';

const { Title } = Typography;

// 商品状态映射
const getProductStatusInfo = (status: string) => {
  const statusMap = {
    'draft': {
      text: '草稿',
      color: '#8B5CF6',
      icon: <FileTextOutlined />
    },
    'pending_review': {
      text: '待审核',
      color: '#F59E0B',
      icon: <ClockCircleOutlined />
    },
    'on_sale': {
      text: '在售',
      color: '#10B981',
      icon: <CheckCircleOutlined />
    },
    'off_sale': {
      text: '下架',
      color: '#EF4444',
      icon: <EyeInvisibleOutlined />
    }
  };
  
  return statusMap[status as keyof typeof statusMap] || {
    text: status,
    color: '#6B7280',
    icon: <FileTextOutlined />
  };
};

function DashboardContent() {
  const router = useRouter();
  // 获取今日日期（格式：YYYY-MM-DD）
  const today = new Date().toISOString().split('T')[0];
  
  // 辅助函数：安全地获取产品图片URL
  const getProductImageUrl = (images: any) => {
    return getImageUrl(images, IMAGE_CONFIGS.RANKING_THUMB);
  };
  
  // 使用超级管理员权限的 GraphQL hooks 获取全局数据
  const { data: dashboardData, loading: dashboardLoading, error: dashboardError } = useGetDashboardDataQuery({
    variables: { today }
  });
  const { data: ordersData, loading: ordersLoading } = useGetRecentOrdersQuery({ 
    variables: { limit: 3 }
  });

  const loading = dashboardLoading || ordersLoading;

  // 从 GraphQL 数据中提取统计信息，优先使用聚合数据，回退到数组长度
  const statsData = {
    totalOrders: dashboardData?.orders_aggregated?.[0]?.countAll || dashboardData?.orders?.length || 0,
    totalBoutiques: dashboardData?.boutiques_aggregated?.[0]?.countAll || dashboardData?.boutiques?.length || 0,
    totalTerminals: dashboardData?.terminals_aggregated?.[0]?.countAll || dashboardData?.terminals?.length || 0,
    totalCustomers: dashboardData?.customers_aggregated?.[0]?.countAll || dashboardData?.customers?.length || 0,
    totalViews: dashboardData?.views_aggregated?.[0]?.countAll || dashboardData?.views?.length || 0,
    totalVisits: dashboardData?.visits_aggregated?.[0]?.countAll || dashboardData?.visits?.length || 0,
    todayOrders: dashboardData?.today_orders?.length || 0,
    todayViews: dashboardData?.today_views?.length || 0,
    todayVisits: dashboardData?.today_visits?.length || 0
  };

  // 处理访问最多的店铺排名
  const getMostVisitedBoutiques = () => {
    if (!dashboardData?.all_visits_for_ranking) return [];
    
    // 按店铺ID统计访问次数
    const visitCounts = new Map();
    dashboardData.all_visits_for_ranking.forEach(visit => {
      if (visit.boutique) {
        const boutiqueId = visit.boutique.id;
        if (visitCounts.has(boutiqueId)) {
          visitCounts.set(boutiqueId, {
            ...visitCounts.get(boutiqueId),
            count: visitCounts.get(boutiqueId).count + 1
          });
        } else {
          visitCounts.set(boutiqueId, {
            boutique: visit.boutique,
            count: 1
          });
        }
      }
    });
    
    // 转换为数组并排序
    return Array.from(visitCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // 处理查看最多的商品排名
  const getMostViewedProducts = () => {
    if (!dashboardData?.all_views_for_ranking) return [];
    
    // 按商品ID统计查看次数
    const viewCounts = new Map();
    dashboardData.all_views_for_ranking.forEach(view => {
      if (view.product) {
        const productId = view.product.id;
        if (viewCounts.has(productId)) {
          viewCounts.set(productId, {
            ...viewCounts.get(productId),
            count: viewCounts.get(productId).count + 1
          });
        } else {
          viewCounts.set(productId, {
            product: view.product,
            count: 1
          });
        }
      }
    });
    
    // 转换为数组并排序
    return Array.from(viewCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const mostVisitedBoutiques = getMostVisitedBoutiques();
  const mostViewedProducts = getMostViewedProducts();

  // 详细调试信息
  console.log('=== Dashboard Debug Info ===');
  console.log('Dashboard data:', dashboardData);
  console.log('Dashboard loading:', dashboardLoading);
  console.log('Dashboard error:', dashboardError);
  console.log('Orders data:', ordersData);
  console.log('Orders aggregated:', dashboardData?.orders_aggregated);
  console.log('Boutiques aggregated:', dashboardData?.boutiques_aggregated);
  console.log('Terminals aggregated:', dashboardData?.terminals_aggregated);
  console.log('Today orders:', dashboardData?.today_orders);
  console.log('Final stats data:', statsData);
  console.log('=== End Debug Info ===');
  
  // 检查是否有认证错误
  const hasAuthError = dashboardError?.message?.includes('credentials') || 
                      dashboardError?.message?.includes('Unauthorized') ||
                      dashboardError?.message?.includes('token');
  
  // 如果所有数据都为0，显示警告信息
  const hasAnyData = statsData.totalBoutiques > 0 || statsData.totalOrders > 0 || 
                    statsData.totalTerminals > 0 || statsData.totalCustomers > 0 || 
                    statsData.totalViews > 0 || statsData.totalVisits > 0;
  const isLoading = dashboardLoading || ordersLoading;

  if (dashboardError) {
    // 检查是否是认证错误
    if (hasAuthError) {
      return (
        <div className="p-6">
          <Alert 
            message="认证失效" 
            description={
              <div>
                <p>您的登录状态已过期，请重新登录以查看数据。</p>
                <Button 
                  type="primary" 
                  onClick={() => router.push('/login')}
                  style={{ marginTop: '12px' }}
                >
                  重新登录
                </Button>
              </div>
            } 
            type="warning" 
            showIcon 
          />
        </div>
      );
    }
    
    return (
      <div className="p-6">
        <Alert 
          message="数据加载失败" 
          description={`无法获取仪表板数据：${dashboardError.message}`} 
          type="error" 
          showIcon 
        />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {isLoading && (
        <div className="dashboard-loading-alert">
          <Spin size="small" />
          <span>正在加载数据...</span>
        </div>
      )}
      
      {/* 统计卡片区域 */}
      <div className="dashboard-stats-grid">
        <div className="dashboard-stat-card orders-card">
          <div className="stat-card-content">
            <div className="stat-card-info">
              <div className="stat-card-label">总订单数</div>
              <div className="stat-card-value">
                {isLoading ? <Spin size="small" /> : statsData.totalOrders.toLocaleString()}
              </div>
              <div className="stat-card-trend positive">
                <span className="trend-icon">↗</span>
                较昨日 +12%
              </div>
            </div>
            <div className="stat-card-icon orders-icon">
              <ShoppingCartOutlined />
            </div>
          </div>
        </div>
        
        <div className="dashboard-stat-card boutiques-card">
          <div className="stat-card-content">
            <div className="stat-card-info">
              <div className="stat-card-label">店铺总数</div>
              <div className="stat-card-value">
                {isLoading ? <Spin size="small" /> : statsData.totalBoutiques.toLocaleString()}
              </div>
              <div className="stat-card-trend neutral">
                <span className="trend-icon">🏪</span>
                入驻店铺
              </div>
            </div>
            <div className="stat-card-icon boutiques-icon">
              <ShopOutlined />
            </div>
          </div>
        </div>
        
        <div className="dashboard-stat-card terminals-card">
          <div className="stat-card-content">
            <div className="stat-card-info">
              <div className="stat-card-label">终端设备</div>
              <div className="stat-card-value">
                {isLoading ? <Spin size="small" /> : statsData.totalTerminals.toLocaleString()}
              </div>
              <div className="stat-card-trend positive">
                <span className="trend-icon">🖥️</span>
                智能设备
              </div>
            </div>
            <div className="stat-card-icon terminals-icon">
              <DashboardOutlined />
            </div>
          </div>
        </div>

        <div className="dashboard-stat-card customers-card">
          <div className="stat-card-content">
            <div className="stat-card-info">
              <div className="stat-card-label">注册客户</div>
              <div className="stat-card-value">
                {isLoading ? <Spin size="small" /> : statsData.totalCustomers.toLocaleString()}
              </div>
              <div className="stat-card-trend positive">
                <span className="trend-icon">👥</span>
                活跃用户
              </div>
            </div>
            <div className="stat-card-icon customers-icon">
              <TeamOutlined />
            </div>
          </div>
        </div>

        <div className="dashboard-stat-card views-card">
          <div className="stat-card-content">
            <div className="stat-card-info">
              <div className="stat-card-label">产品浏览</div>
              <div className="stat-card-value">
                {isLoading ? <Spin size="small" /> : statsData.totalViews.toLocaleString()}
              </div>
              <div className="stat-card-trend positive">
                <span className="trend-icon">👀</span>
                今日 +{statsData.todayViews}
              </div>
            </div>
            <div className="stat-card-icon views-icon">
              <EyeOutlined />
            </div>
          </div>
        </div>

        <div className="dashboard-stat-card visits-card">
          <div className="stat-card-content">
            <div className="stat-card-info">
              <div className="stat-card-label">店铺访问</div>
              <div className="stat-card-value">
                {isLoading ? <Spin size="small" /> : statsData.totalVisits.toLocaleString()}
              </div>
              <div className="stat-card-trend positive">
                <span className="trend-icon">📊</span>
                今日 +{statsData.todayVisits}
              </div>
            </div>
            <div className="stat-card-icon visits-icon">
              <BarChartOutlined />
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="dashboard-main-content">
        {/* 快速操作区域 */}
        <div className="dashboard-quick-actions">
          <div className="dashboard-section-header">
            <h3 className="section-title">快速操作</h3>
            <p className="section-desc">常用功能快速访问</p>
          </div>
          <div className="quick-actions-grid">
            <Button 
              className="quick-action-btn boutiques-btn"
              icon={<ShopOutlined />}
              onClick={() => router.push('/boutiques')}
            >
              <span className="btn-text">
                <strong>店铺管理</strong>
                <small>管理店铺信息</small>
              </span>
            </Button>
            <Button 
              className="quick-action-btn orders-btn"
              icon={<ShoppingCartOutlined />}
              onClick={() => router.push('/orders')}
            >
              <span className="btn-text">
                <strong>查看订单</strong>
                <small>订单处理中心</small>
              </span>
            </Button>
            <Button 
              className="quick-action-btn terminals-btn"
              icon={<DashboardOutlined />}
              onClick={() => router.push('/terminals')}
            >
              <span className="btn-text">
                <strong>终端管理</strong>
                <small>设备监控台</small>
              </span>
            </Button>
            <Button 
              className="quick-action-btn users-btn"
              icon={<UserOutlined />}
              onClick={() => router.push('/users')}
            >
              <span className="btn-text">
                <strong>用户管理</strong>
                <small>系统用户</small>
              </span>
            </Button>
            <Button 
              className="quick-action-btn customers-btn"
              icon={<TeamOutlined />}
              onClick={() => router.push('/customers')}
            >
              <span className="btn-text">
                <strong>客户管理</strong>
                <small>客户关系</small>
              </span>
            </Button>
            <Button 
              className="quick-action-btn views-btn"
              icon={<EyeOutlined />}
              onClick={() => router.push('/views')}
            >
              <span className="btn-text">
                <strong>浏览分析</strong>
                <small>行为分析</small>
              </span>
            </Button>
            <Button 
              className="quick-action-btn visits-btn"
              icon={<BarChartOutlined />}
              onClick={() => router.push('/visits')}
            >
              <span className="btn-text">
                <strong>访问统计</strong>
                <small>流量分析</small>
              </span>
            </Button>
          </div>
        </div>

        {/* 数据展示区域 */}
        <div className="dashboard-data-sections">
          {/* 热门店铺排名 */}
          <div className="dashboard-section popular-boutiques">
            <div className="dashboard-section-header">
              <h3 className="section-title">热门店铺排名</h3>
              <Button 
                type="link" 
                className="section-link"
                onClick={() => router.push('/visits')}
              >
                查看详情 →
              </Button>
            </div>
            <div className="ranking-content">
              {isLoading ? (
                <div className="loading-state">
                  <Spin />
                  <span>加载排名数据...</span>
                </div>
              ) : mostVisitedBoutiques.length > 0 ? (
                <div className="ranking-list">
                  {mostVisitedBoutiques.map((item, index) => (
                    <div key={item.boutique.id} className="ranking-item">
                      <div className="ranking-position">
                        <span className={`rank-badge rank-${index + 1}`}>
                          {index + 1}
                        </span>
                      </div>
                      <div className="ranking-info">
                        <div className="ranking-name">{item.boutique.name}</div>
                        <div className="ranking-detail">{item.boutique.address}</div>
                      </div>
                      <div className="ranking-stats">
                        <div className="stat-number">{item.count}</div>
                        <div className="stat-label">次访问</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🏪</div>
                  <p>暂无访问数据</p>
                </div>
              )}
            </div>
          </div>

          {/* 热门商品排名 */}
          <div className="dashboard-section popular-products">
            <div className="dashboard-section-header">
              <h3 className="section-title">热门商品排名</h3>
              <Button 
                type="link" 
                className="section-link"
                onClick={() => router.push('/views')}
              >
                查看详情 →
              </Button>
            </div>
            <div className="ranking-content">
              {isLoading ? (
                <div className="loading-state">
                  <Spin />
                  <span>加载排名数据...</span>
                </div>
              ) : mostViewedProducts.length > 0 ? (
                <div className="ranking-list">
                  {mostViewedProducts.map((item, index) => (
                    <div key={item.product.id} className="ranking-item">
                      <div className="ranking-position">
                        <span className={`rank-badge rank-${index + 1}`}>
                          {index + 1}
                        </span>
                      </div>
                      <div className="product-image">
                        {(() => {
                          const imageUrl = getProductImageUrl(item.product.images);
                          return imageUrl ? (
                            <img 
                              src={imageUrl}
                              alt={item.product.name}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="no-image">📦</div>
                          );
                        })()}
                      </div>
                      <div className="ranking-info">
                        <div className="ranking-name">{item.product.name}</div>
                        <div className="ranking-detail">
                          ¥{item.product.price?.toFixed(2)} 
                          {item.product.category_id?.name && (
                            <span className="category-tag">
                              {item.product.category_id.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ranking-stats">
                        <div className="stat-number">{item.count}</div>
                        <div className="stat-label">次查看</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📦</div>
                  <p>暂无浏览数据</p>
                </div>
              )}
            </div>
          </div>

          {/* 最近订单 */}
          <div className="dashboard-section recent-orders">
            <div className="dashboard-section-header">
              <h3 className="section-title">最近订单</h3>
              <Button 
                type="link" 
                className="section-link"
                onClick={() => router.push('/orders')}
              >
                查看全部 →
              </Button>
            </div>
            <div className="recent-orders-content">
              {isLoading ? (
                <div className="loading-state">
                  <Spin />
                  <span>加载订单数据...</span>
                </div>
              ) : ordersData?.orders?.length ? (
                <div className="orders-list">
                  {ordersData.orders.map((order) => (
                    <div key={order.id} className="order-item">
                      <div className="order-info">
                        <div className="order-id">#{order.id.substring(0, 8)}</div>
                        <div className="order-customer">{order.customer?.nick_name || '未知用户'}</div>
                        <div className="order-date">
                          {new Date(order.date_created).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      <div className="order-details">
                        <div className="order-price">¥{order.total_price?.toFixed(2) || '0.00'}</div>
                        <div className={`order-status status-${order.status}`}>
                          {order.status === 'completed' ? '已完成' : 
                           order.status === 'processing' ? '处理中' : '待处理'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📦</div>
                  <p>暂无订单数据</p>
                </div>
              )}
            </div>
          </div>

          {/* 系统状态 */}
          <div className="dashboard-section system-status">
            <div className="dashboard-section-header">
              <h3 className="section-title">系统状态</h3>
              <div className="status-indicator online">
                <span className="indicator-dot"></span>
                运行正常
              </div>
            </div>
            <div className="system-metrics">
              <div className="metric-item">
                <div className="metric-icon">🔗</div>
                <div className="metric-info">
                  <span className="metric-label">数据库连接</span>
                  <span className="metric-status online">正常</span>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon">⚡</div>
                <div className="metric-info">
                  <span className="metric-label">API 服务</span>
                  <span className="metric-status online">运行中</span>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon">🔄</div>
                <div className="metric-info">
                  <span className="metric-label">最后同步</span>
                  <span className="metric-value">刚刚</span>
                </div>
              </div>
              <div className="metric-item">
                <div className="metric-icon">📊</div>
                <div className="metric-info">
                  <span className="metric-label">活跃店铺</span>
                  <span className="metric-value">{statsData.totalBoutiques}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 页脚 */}
      <div className="dashboard-footer">
        <p>&copy; {new Date().getFullYear()} Steamroller Management System. 保留所有权利.</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <DashboardContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}
