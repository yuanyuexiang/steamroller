'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Tag, 
  Button, 
  Modal, 
  Descriptions, 
  Typography, 
  Select, 
  message,
  Space,
  Row,
  Col,
  Input,
  Avatar,
  Statistic
} from 'antd';
import { 
  EyeOutlined, 
  TeamOutlined,
  UserOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  BarChartOutlined,
  ShopOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { 
  useGetAllVisitsQuery,
  GetAllVisitsQuery
} from '../../generated/graphql';
import { useGetAllBoutiquesQuery } from '../../generated/graphql';
import { ProtectedRoute, AdminLayout } from '@components';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// 使用生成的类型
type Visit = GetAllVisitsQuery['visits'][0];

function VisitsContent() {
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedBoutique, setSelectedBoutique] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  // 查询访问记录列表
  const { data: visitsData, loading, error, refetch } = useGetAllVisitsQuery();
  
  // 查询店铺列表（用于筛选）
  const { data: boutiquesData } = useGetAllBoutiquesQuery();

  // 页面获得焦点时自动刷新列表
  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetch]);

  const visits = visitsData?.visits || [];
  const boutiques = boutiquesData?.boutiques || [];

  // 处理错误
  if (error) {
    console.error('获取访问记录失败:', error);
    message.error('获取访问记录失败');
  }

  // 过滤访问记录
  const filteredVisits = visits.filter(visit => {
    // 搜索文本过滤
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchSearch = (
        visit.id.toString().includes(searchLower) ||
        visit.customer?.nick_name?.toLowerCase().includes(searchLower) ||
        visit.customer?.open_id?.toLowerCase().includes(searchLower) ||
        visit.boutique?.name?.toLowerCase().includes(searchLower)
      );
      if (!matchSearch) return false;
    }

    // 店铺过滤
    if (selectedBoutique && visit.boutique?.id !== selectedBoutique) {
      return false;
    }

    // 日期过滤
    if (dateFilter) {
      const visitDate = new Date(visit.date_created);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          if (visitDate.toDateString() !== today.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (visitDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (visitDate < monthAgo) return false;
          break;
      }
    }

    return true;
  });

  // 计算统计数据
  const totalVisits = visits.length;
  const uniqueCustomers = new Set(visits.map(visit => visit.customer?.id).filter(Boolean)).size;
  const uniqueBoutiques = new Set(visits.map(visit => visit.boutique?.id).filter(Boolean)).size;
  const todayVisits = visits.filter(visit => {
    const visitDate = new Date(visit.date_created);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString();
  }).length;

  // 查看访问记录详情
  const viewDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setDetailModalVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '记录ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <Text code>{id}</Text>
      ),
    },
    {
      title: '访问客户',
      key: 'customer',
      width: 200,
      render: (record: Visit) => (
        <div>
          {record.customer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar 
                src={record.customer.avatar} 
                icon={<UserOutlined />}
                size={32}
              />
              <div>
                <div style={{ fontWeight: 500 }}>
                  {record.customer.nick_name || '未设置昵称'}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {record.customer.open_id?.substring(0, 12)}...
                </div>
              </div>
            </div>
          ) : (
            <Text type="secondary">未知用户</Text>
          )}
        </div>
      ),
    },
    {
      title: '访问店铺',
      key: 'boutique',
      width: 200,
      render: (record: Visit) => {
        if (record.boutique) {
          return (
            <div>
              <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShopOutlined /> {record.boutique.name}
              </div>
              {record.boutique.address && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {record.boutique.address}
                </div>
              )}
            </div>
          );
        }
        return <Tag>未分配店铺</Tag>;
      },
    },
    {
      title: '访问时间',
      dataIndex: 'date_created',
      key: 'date_created',
      width: 160,
      render: (date: string) => (
        <div>
          <ClockCircleOutlined /> {new Date(date).toLocaleString()}
        </div>
      ),
    },
    {
      title: '停留时长',
      key: 'duration',
      width: 120,
      render: (record: Visit) => {
        // 这里可以根据实际业务逻辑计算停留时长
        // 目前先显示一个占位符
        return <Text type="secondary">-</Text>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: Visit) => (
        <Space>
          <Button
            className="action-btn detail-btn"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewDetails(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="visits-page-container">
      {/* 统计卡片 */}
      <div className="visits-stats-section">
        <div className="visits-stat-card total-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{totalVisits}</div>
              <div className="stat-label">总访问次数</div>
            </div>
            <div className="stat-icon total-visits">
              <EyeOutlined />
            </div>
          </div>
        </div>
        
        <div className="visits-stat-card customers-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{uniqueCustomers}</div>
              <div className="stat-label">访问用户数</div>
            </div>
            <div className="stat-icon unique-customers">
              <TeamOutlined />
            </div>
          </div>
        </div>
        
        <div className="visits-stat-card boutiques-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{uniqueBoutiques}</div>
              <div className="stat-label">访问店铺数</div>
            </div>
            <div className="stat-icon unique-boutiques">
              <ShopOutlined />
            </div>
          </div>
        </div>
        
        <div className="visits-stat-card today-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{todayVisits}</div>
              <div className="stat-label">今日访问</div>
            </div>
            <div className="stat-icon today-visits">
              <BarChartOutlined />
            </div>
          </div>
        </div>
      </div>

      {/* 访问记录表格 */}
      <div className="visits-table-container">
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={24} md={8} lg={8}>
              <Search
                placeholder="搜索记录ID、客户或店铺"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="large"
                prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
                style={{ borderRadius: '12px' }}
              />
            </Col>
            <Col xs={12} sm={8} md={4} lg={4}>
              <Select
                placeholder="选择店铺"
                value={selectedBoutique}
                onChange={setSelectedBoutique}
                allowClear
                style={{ width: '100%' }}
                size="large"
              >
                {boutiques.map(boutique => (
                  <Option key={boutique.id} value={boutique.id}>
                    {boutique.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} sm={8} md={4} lg={4}>
              <Select
                placeholder="时间范围"
                value={dateFilter}
                onChange={setDateFilter}
                allowClear
                style={{ width: '100%' }}
                size="large"
              >
                <Option value="today">今天</Option>
                <Option value="week">近一周</Option>
                <Option value="month">近一月</Option>
              </Select>
            </Col>
            <Col xs={24} sm={24} md={8} lg={8}>
              <div style={{ textAlign: 'right' }}>
                <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                  共找到 {filteredVisits.length} 条访问记录
                </Text>
              </div>
            </Col>
          </Row>
        </div>
        <Table
          columns={columns}
          dataSource={filteredVisits}
          rowKey="id"
          loading={loading}
          className="modern-table"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条访问记录`,
            size: 'default',
            position: ['bottomCenter']
          }}
          scroll={{ y: 'calc(100vh - 350px)' }}
          size="middle"
        />
      </div>

      {/* 访问记录详情弹窗 */}
      <Modal
        title="访问记录详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button 
            key="close" 
            className="modal-close-btn"
            onClick={() => setDetailModalVisible(false)}
          >
            关闭
          </Button>,
        ]}
        width={800}
        className="modern-modal"
      >
        {selectedVisit && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="记录ID" span={2}>
                <Text code copyable={{ text: selectedVisit.id }}>
                  {selectedVisit.id}
                </Text>
              </Descriptions.Item>
              
              {/* 客户信息 */}
              <Descriptions.Item label="客户头像">
                {selectedVisit.customer ? (
                  <Avatar 
                    src={selectedVisit.customer.avatar} 
                    icon={<UserOutlined />}
                    size={60}
                  />
                ) : (
                  <Text type="secondary">无</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="客户昵称">
                {selectedVisit.customer?.nick_name || '未设置昵称'}
              </Descriptions.Item>
              <Descriptions.Item label="客户OpenID" span={2}>
                {selectedVisit.customer ? (
                  <Text code copyable={{ text: selectedVisit.customer.open_id || '' }}>
                    {selectedVisit.customer.open_id}
                  </Text>
                ) : (
                  <Text type="secondary">无</Text>
                )}
              </Descriptions.Item>

              {/* 店铺信息 */}
              <Descriptions.Item label="访问店铺" span={2}>
                {selectedVisit.boutique ? (
                  <div>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShopOutlined /> {selectedVisit.boutique.name}
                    </div>
                    <div style={{ color: '#666', marginTop: '4px' }}>
                      {selectedVisit.boutique.address && `地址: ${selectedVisit.boutique.address}`}
                      {selectedVisit.boutique.city && ` | 城市: ${selectedVisit.boutique.city}`}
                    </div>
                  </div>
                ) : (
                  <Tag>未分配店铺</Tag>
                )}
              </Descriptions.Item>

              {/* 访问详情 */}
              <Descriptions.Item label="访问时间">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CalendarOutlined />
                  {selectedVisit.date_created ? new Date(selectedVisit.date_created).toLocaleString() : ''}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="记录更新">
                {selectedVisit.date_updated ? new Date(selectedVisit.date_updated).toLocaleString() : ''}
              </Descriptions.Item>
              <Descriptions.Item label="停留时长">
                <Text type="secondary">暂无数据</Text>
              </Descriptions.Item>
              <Descriptions.Item label="访问类型">
                <Tag>店铺访问</Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function VisitsPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <VisitsContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}