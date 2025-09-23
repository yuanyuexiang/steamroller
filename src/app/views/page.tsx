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
  Image
} from 'antd';
import { 
  EyeOutlined, 
  ShoppingOutlined,
  UserOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  BarChartOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { 
  useGetAllViewsQuery,
  GetAllViewsQuery
} from '../../generated/graphql';
import { useGetAllBoutiquesQuery } from '../../generated/graphql';
import { ProtectedRoute, AdminLayout } from '@components';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// 使用生成的类型
type View = GetAllViewsQuery['views'][0];

function ViewsContent() {
  const [selectedView, setSelectedView] = useState<View | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedBoutique, setSelectedBoutique] = useState<string>('');

  // 查询浏览记录列表
  const { data: viewsData, loading, error, refetch } = useGetAllViewsQuery();
  
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

  const views = viewsData?.views || [];
  const boutiques = boutiquesData?.boutiques || [];

  // 处理错误
  if (error) {
    console.error('获取浏览记录失败:', error);
    message.error('获取浏览记录失败');
  }

  // 过滤浏览记录
  const filteredViews = views.filter(view => {
    // 搜索文本过滤
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchSearch = (
        view.id.toString().includes(searchLower) ||
        view.customer?.nick_name?.toLowerCase().includes(searchLower) ||
        view.customer?.open_id?.toLowerCase().includes(searchLower) ||
        view.product?.name?.toLowerCase().includes(searchLower) ||
        view.boutique?.name?.toLowerCase().includes(searchLower)
      );
      if (!matchSearch) return false;
    }

    // 店铺过滤
    if (selectedBoutique && view.boutique?.id !== selectedBoutique) {
      return false;
    }

    return true;
  });

  // 计算统计数据
  const totalViews = views.length;
  const uniqueCustomers = new Set(views.map(view => view.customer?.id).filter(Boolean)).size;
  const uniqueProducts = new Set(views.map(view => view.product?.id).filter(Boolean)).size;
  const todayViews = views.filter(view => {
    const viewDate = new Date(view.date_created);
    const today = new Date();
    return viewDate.toDateString() === today.toDateString();
  }).length;

  // 查看浏览记录详情
  const viewDetails = (view: View) => {
    setSelectedView(view);
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
      title: '客户信息',
      key: 'customer',
      width: 200,
      render: (record: View) => (
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
      title: '浏览商品',
      key: 'product',
      width: 250,
      render: (record: View) => (
        <div>
          {record.product ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '4px', 
                overflow: 'hidden',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {record.product.main_image ? (
                  <Image 
                    src={record.product.main_image} 
                    alt={record.product.name}
                    width={40}
                    height={40}
                    style={{ objectFit: 'cover' }}
                    preview={false}
                  />
                ) : (
                  <PictureOutlined style={{ color: '#999' }} />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>
                  {record.product.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  ¥{record.product.price?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
          ) : (
            <Text type="secondary">未知商品</Text>
          )}
        </div>
      ),
    },
    {
      title: '所属店铺',
      key: 'boutique',
      width: 180,
      render: (record: View) => {
        if (record.boutique) {
          return (
            <div>
              <div style={{ fontWeight: 500 }}>{record.boutique.name}</div>
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
      title: '浏览时间',
      dataIndex: 'date_created',
      key: 'date_created',
      width: 150,
      render: (date: string) => (
        <div>
          <ClockCircleOutlined /> {new Date(date).toLocaleString()}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: View) => (
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
    <div className="views-page-container">
      {/* 统计卡片 */}
      <div className="views-stats-section">
        <div className="views-stat-card total-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{totalViews}</div>
              <div className="stat-label">总浏览次数</div>
            </div>
            <div className="stat-icon total-views">
              <EyeOutlined />
            </div>
          </div>
        </div>
        
        <div className="views-stat-card customers-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{uniqueCustomers}</div>
              <div className="stat-label">浏览用户数</div>
            </div>
            <div className="stat-icon unique-customers">
              <UserOutlined />
            </div>
          </div>
        </div>
        
        <div className="views-stat-card products-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{uniqueProducts}</div>
              <div className="stat-label">浏览商品数</div>
            </div>
            <div className="stat-icon unique-products">
              <ShoppingOutlined />
            </div>
          </div>
        </div>
        
        <div className="views-stat-card today-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{todayViews}</div>
              <div className="stat-label">今日浏览</div>
            </div>
            <div className="stat-icon today-views">
              <BarChartOutlined />
            </div>
          </div>
        </div>
      </div>

      {/* 浏览记录表格 */}
      <div className="views-table-container">
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={24} md={12} lg={10}>
              <Search
                placeholder="搜索记录ID、客户、商品或店铺"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="large"
                prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
                style={{ borderRadius: '12px' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6} lg={6}>
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
            <Col xs={24} sm={12} md={6} lg={8}>
              <div style={{ textAlign: 'right' }}>
                <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                  共找到 {filteredViews.length} 条浏览记录
                </Text>
              </div>
            </Col>
          </Row>
        </div>
        <Table
          columns={columns}
          dataSource={filteredViews}
          rowKey="id"
          loading={loading}
          className="modern-table"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条浏览记录`,
            size: 'default',
            position: ['bottomCenter']
          }}
          scroll={{ y: 'calc(100vh - 350px)' }}
          size="middle"
        />
      </div>

      {/* 浏览记录详情弹窗 */}
      <Modal
        title="浏览记录详情"
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
        {selectedView && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="记录ID" span={2}>
                <Text code copyable={{ text: selectedView.id }}>
                  {selectedView.id}
                </Text>
              </Descriptions.Item>
              
              {/* 客户信息 */}
              <Descriptions.Item label="客户头像">
                {selectedView.customer ? (
                  <Avatar 
                    src={selectedView.customer.avatar} 
                    icon={<UserOutlined />}
                    size={60}
                  />
                ) : (
                  <Text type="secondary">无</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="客户昵称">
                {selectedView.customer?.nick_name || '未设置昵称'}
              </Descriptions.Item>
              <Descriptions.Item label="客户OpenID" span={2}>
                {selectedView.customer ? (
                  <Text code copyable={{ text: selectedView.customer.open_id || '' }}>
                    {selectedView.customer.open_id}
                  </Text>
                ) : (
                  <Text type="secondary">无</Text>
                )}
              </Descriptions.Item>

              {/* 商品信息 */}
              <Descriptions.Item label="商品图片">
                {selectedView.product?.main_image ? (
                  <Image 
                    src={selectedView.product.main_image} 
                    alt={selectedView.product.name}
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover', borderRadius: '4px' }}
                  />
                ) : (
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PictureOutlined style={{ color: '#999', fontSize: '24px' }} />
                  </div>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="商品名称">
                {selectedView.product?.name || '未知商品'}
              </Descriptions.Item>
              <Descriptions.Item label="商品价格">
                {selectedView.product ? (
                  <Text strong style={{ color: '#f50' }}>
                    ¥{selectedView.product.price?.toFixed(2) || '0.00'}
                  </Text>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="商品描述">
                {selectedView.product?.description || '-'}
              </Descriptions.Item>

              {/* 店铺信息 */}
              <Descriptions.Item label="所属店铺" span={2}>
                {selectedView.boutique ? (
                  <div>
                    <div style={{ fontWeight: 500 }}>{selectedView.boutique.name}</div>
                    <div style={{ color: '#666', marginTop: '4px' }}>
                      {selectedView.boutique.address && `地址: ${selectedView.boutique.address}`}
                      {selectedView.boutique.city && ` | 城市: ${selectedView.boutique.city}`}
                    </div>
                  </div>
                ) : (
                  <Tag>未分配店铺</Tag>
                )}
              </Descriptions.Item>

              {/* 时间信息 */}
              <Descriptions.Item label="浏览时间">
                {selectedView.date_created ? new Date(selectedView.date_created).toLocaleString() : ''}
              </Descriptions.Item>
              <Descriptions.Item label="记录更新">
                {selectedView.date_updated ? new Date(selectedView.date_updated).toLocaleString() : ''}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function ViewsPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <ViewsContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}