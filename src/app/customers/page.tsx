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
  Avatar
} from 'antd';
import { 
  EyeOutlined, 
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  ManOutlined,
  WomanOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { 
  useGetAllCustomersQuery,
  GetAllCustomersQuery
} from '../../generated/graphql';
import { useGetAllBoutiquesQuery } from '../../generated/graphql';
import { ProtectedRoute, AdminLayout } from '@components';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// 使用生成的类型
type Customer = GetAllCustomersQuery['customers'][0];

function CustomersContent() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedBoutique, setSelectedBoutique] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // 查询客户列表
  const { data: customersData, loading, error, refetch } = useGetAllCustomersQuery();
  
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

  const customers = customersData?.customers || [];
  const boutiques = boutiquesData?.boutiques || [];

  // 处理错误
  if (error) {
    console.error('获取客户列表失败:', error);
    message.error('获取客户列表失败');
  }

  // 过滤客户
  const filteredCustomers = customers.filter(customer => {
    // 搜索文本过滤
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchSearch = (
        customer.id.toString().includes(searchLower) ||
        customer.nick_name?.toLowerCase().includes(searchLower) ||
        customer.open_id?.toLowerCase().includes(searchLower) ||
        customer.boutique?.name?.toLowerCase().includes(searchLower)
      );
      if (!matchSearch) return false;
    }

    // 店铺过滤
    if (selectedBoutique && customer.boutique?.id !== selectedBoutique) {
      return false;
    }

    // 状态过滤
    if (statusFilter && customer.status !== statusFilter) {
      return false;
    }

    return true;
  });

  // 计算统计数据
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(customer => customer.status === 'published').length;
  const maleCustomers = customers.filter(customer => customer.sex === 1).length;
  const femaleCustomers = customers.filter(customer => customer.sex === 2).length;

  // 性别图标
  const getSexIcon = (sex: number | null | undefined) => {
    switch (sex) {
      case 1: return <ManOutlined style={{ color: '#1890ff' }} />;
      case 2: return <WomanOutlined style={{ color: '#f759ab' }} />;
      default: return <QuestionCircleOutlined style={{ color: '#999' }} />;
    }
  };

  // 性别文本
  const getSexText = (sex: number | null | undefined) => {
    switch (sex) {
      case 1: return '男';
      case 2: return '女';
      default: return '未知';
    }
  };

  // 状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'green';
      case 'draft': return 'orange';
      case 'archived': return 'red';
      default: return 'default';
    }
  };

  // 状态显示文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return '已激活';
      case 'draft': return '草稿';
      case 'archived': return '已归档';
      default: return status;
    }
  };

  // 查看客户详情
  const viewCustomerDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailModalVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '客户ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <Text code>{id}</Text>
      ),
    },
    {
      title: '头像',
      key: 'avatar',
      width: 80,
      render: (record: Customer) => (
        <Avatar 
          src={record.avatar} 
          icon={<UserOutlined />}
          size={40}
        />
      ),
    },
    {
      title: '客户信息',
      key: 'customer',
      width: 200,
      render: (record: Customer) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {getSexIcon(record.sex)} {record.nick_name || '未设置昵称'}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            OpenID: {record.open_id.substring(0, 12)}...
          </div>
        </div>
      ),
    },
    {
      title: '性别',
      dataIndex: 'sex',
      key: 'sex',
      width: 80,
      render: (sex: number) => (
        <div>
          {getSexIcon(sex)} {getSexText(sex)}
        </div>
      ),
    },
    {
      title: '所属店铺',
      key: 'boutique',
      width: 180,
      render: (record: Customer) => {
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'date_created',
      key: 'date_created',
      width: 150,
      render: (date: string) => (
        <div>
          <ClockCircleOutlined /> {new Date(date).toLocaleDateString()}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: Customer) => (
        <Space>
          <Button
            className="action-btn detail-btn"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewCustomerDetails(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="customers-page-container">
      {/* 统计卡片 */}
      <div className="customers-stats-section">
        <div className="customers-stat-card total-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{totalCustomers}</div>
              <div className="stat-label">总客户数</div>
            </div>
            <div className="stat-icon total-customers">
              <TeamOutlined />
            </div>
          </div>
        </div>
        
        <div className="customers-stat-card active-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{activeCustomers}</div>
              <div className="stat-label">活跃客户</div>
            </div>
            <div className="stat-icon active-customers">
              <UserOutlined />
            </div>
          </div>
        </div>
        
        <div className="customers-stat-card male-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{maleCustomers}</div>
              <div className="stat-label">男性客户</div>
            </div>
            <div className="stat-icon male-customers">
              <ManOutlined />
            </div>
          </div>
        </div>
        
        <div className="customers-stat-card female-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <div className="stat-value">{femaleCustomers}</div>
              <div className="stat-label">女性客户</div>
            </div>
            <div className="stat-icon female-customers">
              <WomanOutlined />
            </div>
          </div>
        </div>
      </div>

      {/* 客户表格 */}
      <div className="customers-table-container">
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={24} md={10} lg={8}>
              <Search
                placeholder="搜索客户ID、昵称或OpenID"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="large"
                prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
                style={{ borderRadius: '12px' }}
              />
            </Col>
            <Col xs={12} sm={8} md={6} lg={5}>
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
            <Col xs={12} sm={8} md={6} lg={5}>
              <Select
                placeholder="客户状态"
                value={statusFilter}
                onChange={setStatusFilter}
                allowClear
                style={{ width: '100%' }}
                size="large"
              >
                <Option value="published">已激活</Option>
                <Option value="draft">草稿</Option>
                <Option value="archived">已归档</Option>
              </Select>
            </Col>
            <Col xs={24} sm={24} md={2} lg={6}>
              <div style={{ textAlign: 'right' }}>
                <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                  共找到 {filteredCustomers.length} 位客户
                </Text>
              </div>
            </Col>
          </Row>
        </div>
        <Table
          columns={columns}
          dataSource={filteredCustomers}
          rowKey="id"
          loading={loading}
          className="modern-table"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条客户记录`,
            size: 'default',
            position: ['bottomCenter']
          }}
          scroll={{ y: 'calc(100vh - 350px)' }}
          size="middle"
        />
      </div>

      {/* 客户详情弹窗 */}
      <Modal
        title="客户详情"
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
        {selectedCustomer && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="客户ID" span={2}>
                <Text code copyable={{ text: selectedCustomer.id }}>
                  {selectedCustomer.id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="头像">
                <Avatar 
                  src={selectedCustomer.avatar} 
                  icon={<UserOutlined />}
                  size={60}
                />
              </Descriptions.Item>
              <Descriptions.Item label="昵称">
                {selectedCustomer.nick_name || '未设置昵称'}
              </Descriptions.Item>
              <Descriptions.Item label="性别">
                {getSexIcon(selectedCustomer.sex)} {getSexText(selectedCustomer.sex)}
              </Descriptions.Item>
              <Descriptions.Item label="OpenID">
                <Text code copyable={{ text: selectedCustomer.open_id }}>
                  {selectedCustomer.open_id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(selectedCustomer.status || '')}>
                  {getStatusText(selectedCustomer.status || '')}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="客户类型">
                {selectedCustomer.type || '普通客户'}
              </Descriptions.Item>
              <Descriptions.Item label="所属店铺" span={2}>
                {selectedCustomer.boutique ? (
                  <div>
                    <div style={{ fontWeight: 500 }}>{selectedCustomer.boutique.name}</div>
                    <div style={{ color: '#666', marginTop: '4px' }}>
                      {selectedCustomer.boutique.address && `地址: ${selectedCustomer.boutique.address}`}
                      {selectedCustomer.boutique.city && ` | 城市: ${selectedCustomer.boutique.city}`}
                    </div>
                  </div>
                ) : (
                  <Tag>未分配店铺</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {selectedCustomer.date_created ? new Date(selectedCustomer.date_created).toLocaleString() : ''}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {selectedCustomer.date_updated ? new Date(selectedCustomer.date_updated).toLocaleString() : ''}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <CustomersContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}