'use client'

import { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select,
  Typography, 
  message, 
  Tag, 
  Popconfirm,
  Row,
  Col,
  Statistic,
  Descriptions,
  Badge,
  Tooltip,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  DesktopOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DownloadOutlined,
  SearchOutlined,
  MobileOutlined,
  TabletOutlined,
  LaptopOutlined,
  InfoCircleOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { 
  useGetAllTerminalsQuery,
  useCreateTerminalMutation,
  useUpdateTerminalMutation,
  useDeleteTerminalMutation,
  useGetAllBoutiquesQuery,
  GetAllTerminalsQuery
} from '../../generated/graphql';
import { ProtectedRoute, AdminLayout } from '@components';
import { exportTerminals } from '@lib/utils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;

type Terminal = NonNullable<GetAllTerminalsQuery['terminals'][0]>;

export default function TerminalsPage() {
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [viewingTerminal, setViewingTerminal] = useState<Terminal | null>(null);
  const [form] = Form.useForm();

  // 查询终端设备（超级管理员权限 - 查看所有终端）
  const { data: terminalsData, loading, refetch } = useGetAllTerminalsQuery();
  const { data: boutiquesData } = useGetAllBoutiquesQuery();
  const terminals = terminalsData?.terminals || [];
  const boutiques = boutiquesData?.boutiques || [];

  // 变更操作
  const [createTerminal] = useCreateTerminalMutation({
    onCompleted: () => {
      message.success('终端设备创建成功');
      setIsModalVisible(false);
      form.resetFields();
      refetch();
    },
    onError: (error) => {
      console.error('创建终端设备失败:', error);
      message.error('创建终端设备失败');
    }
  });

  const [updateTerminal] = useUpdateTerminalMutation({
    onCompleted: () => {
      message.success('终端设备更新成功');
      setIsModalVisible(false);
      form.resetFields();
      setEditingTerminal(null);
      refetch();
    },
    onError: (error) => {
      console.error('更新终端设备失败:', error);
      message.error('更新终端设备失败');
    }
  });

  const [deleteTerminal] = useDeleteTerminalMutation({
    onCompleted: () => {
      message.success('终端设备删除成功');
      refetch();
    },
    onError: (error) => {
      console.error('删除终端设备失败:', error);
      message.error('删除终端设备失败');
    }
  });

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

  // 过滤终端设备
  const filteredTerminals = terminals.filter(terminal => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      terminal.id.toLowerCase().includes(searchLower) ||
      terminal.device_name?.toLowerCase().includes(searchLower) ||
      terminal.device_type?.toLowerCase().includes(searchLower) ||
      terminal.brand?.toLowerCase().includes(searchLower) ||
      terminal.manufacturer?.toLowerCase().includes(searchLower) ||
      terminal.model_name?.toLowerCase().includes(searchLower) ||
      terminal.os_name?.toLowerCase().includes(searchLower) ||
      terminal.purposes?.toLowerCase().includes(searchLower) ||
      terminal.authorized_boutique?.name?.toLowerCase().includes(searchLower) ||
      terminal.authorized_boutique?.code?.toLowerCase().includes(searchLower) ||
      terminal.user_created?.first_name?.toLowerCase().includes(searchLower) ||
      terminal.user_created?.last_name?.toLowerCase().includes(searchLower) ||
      terminal.user_created?.email?.toLowerCase().includes(searchLower)
    );
  });

  // 处理导出功能
  const handleExport = () => {
    try {
      if (terminals.length === 0) {
        message.warning('暂无数据可导出');
        return;
      }
      exportTerminals(terminals);
      message.success('数据导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请重试');
    }
  };

  // 计算统计数据
  const totalTerminals = terminals.length;
  const todayTerminals = terminals.filter(t => 
    t.date_created && dayjs(t.date_created).isAfter(dayjs().startOf('day'))
  ).length;
  
  // 按设备类型统计
  const deviceTypeStats = terminals.reduce((acc, terminal) => {
    const type = terminal.device_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // 有关联精品店的终端数量
  const connectedTerminals = terminals.filter(t => t.authorized_boutique).length;
  
  // 最常用的设备类型
  const mostCommonType = Object.keys(deviceTypeStats).reduce((a, b) => 
    deviceTypeStats[a] > deviceTypeStats[b] ? a : b, 'none'
  );

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      const formData = { ...values };
      
      // 处理关联精品店字段
      if (formData.authorized_boutique) {
        formData.authorized_boutique = { id: formData.authorized_boutique };
      } else {
        // 如果没有选择精品店，确保字段为null
        formData.authorized_boutique = null;
      }

      if (editingTerminal) {
        await updateTerminal({
          variables: {
            id: editingTerminal.id,
            data: formData
          }
        });
      } else {
        await createTerminal({
          variables: {
            data: formData
          }
        });
      }
      
      // 成功后关闭Modal并重置表单
      setIsModalVisible(false);
      form.resetFields();
      setEditingTerminal(null);
      
    } catch (error) {
      console.error('提交失败:', error);
      message.error('操作失败，请重试');
    }
  };

  // 处理编辑
  const handleEdit = (terminal: Terminal) => {
    setEditingTerminal(terminal);
    form.setFieldsValue({
      device_name: terminal.device_name,
      device_type: terminal.device_type,
      brand: terminal.brand,
      manufacturer: terminal.manufacturer,
      model_name: terminal.model_name,
      os_name: terminal.os_name,
      os_version: terminal.os_version,
      android_id: terminal.android_id,
      total_memory: terminal.total_memory,
      supported_cpu_architectures: terminal.supported_cpu_architectures,
      purposes: terminal.purposes,
      authorized_boutique: terminal.authorized_boutique?.id,
    });
    setIsModalVisible(true);
  };

  // 查看详情
  const handleViewDetails = (terminal: Terminal) => {
    setViewingTerminal(terminal);
    setDetailModalVisible(true);
  };

  // 处理删除
  const handleDelete = async (terminalId: string) => {
    try {
      await deleteTerminal({ variables: { id: terminalId } });
    } catch (error) {
      console.error('删除终端设备时出错:', error);
    }
  };  // 表格列定义
  // 获取设备类型图标
  const getDeviceIcon = (deviceType: string | null | undefined) => {
    switch(deviceType?.toLowerCase()) {
      case 'phone':
      case 'mobile':
        return <MobileOutlined />;
      case 'tablet':
        return <TabletOutlined />;
      case 'laptop':
      case 'computer':
        return <LaptopOutlined />;
      default:
        return <DesktopOutlined />;
    }
  };

  // 获取用途中文名称
  const getPurposeLabel = (purpose: string | null | undefined) => {
    switch(purpose) {
      case 'interaction':
        return '交互';
      case 'carousel':
        return '轮播';
      default:
        return purpose || '-';
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <Tag color="blue">{id.slice(0, 8)}...</Tag>
      ),
    },
    {
      title: '设备信息',
      key: 'device_info',
      width: 300,
      render: (record: Terminal) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
            {getDeviceIcon(record.device_type)}
            <span style={{ marginLeft: 8, fontWeight: 'bold' }}>
              {record.device_name || record.model_name || '未知设备'}
            </span>
            {record.device_type && (
              <Tag color="processing" style={{ marginLeft: 8 }}>
                {record.device_type}
              </Tag>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.brand && `品牌: ${record.brand}`}
            {record.brand && record.manufacturer && ' • '}
            {record.manufacturer && `制造商: ${record.manufacturer}`}
          </div>
          {record.os_name && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.os_name} {record.os_version}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '硬件配置',
      key: 'hardware_info',
      width: 200,
      render: (record: Terminal) => (
        <div>
          {record.total_memory && (
            <div style={{ fontSize: '12px' }}>
              <strong>内存:</strong> {record.total_memory}
            </div>
          )}
          {record.supported_cpu_architectures && (
            <div style={{ fontSize: '12px' }}>
              <strong>CPU:</strong> {record.supported_cpu_architectures}
            </div>
          )}
          {record.android_id && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              <strong>Android ID:</strong> {record.android_id.slice(0, 8)}...
            </div>
          )}
        </div>
      ),
    },
    {
      title: '关联精品店',
      key: 'authorized_boutique',
      width: 180,
      render: (record: Terminal) => (
        record.authorized_boutique ? (
          <div>
            <ShopOutlined style={{ color: '#1890ff' }} />
            <span style={{ marginLeft: 4 }}>
              {record.authorized_boutique.name}
            </span>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.authorized_boutique.code}
            </div>
          </div>
        ) : (
          <Tag color="default">未关联</Tag>
        )
      ),
    },
    {
      title: '用途',
      dataIndex: 'purposes',
      key: 'purposes',
      width: 120,
      render: (purposes: string) => (
        purposes ? (
          <Tag color="cyan">{getPurposeLabel(purposes)}</Tag>
        ) : (
          <span style={{ color: '#ccc' }}>-</span>
        )
      ),
    },
    {
      title: '创建用户',
      key: 'user_created',
      width: 150,
      render: (record: Terminal) => (
        <div>
          <div>
            <UserOutlined /> {record.user_created?.last_name}{record.user_created?.first_name}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.user_created?.email}
          </div>
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'date_created',
      key: 'date_created',
      width: 180,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
      sorter: (a: Terminal, b: Terminal) => {
        const dateA = a.date_created ? new Date(a.date_created).getTime() : 0;
        const dateB = b.date_created ? new Date(b.date_created).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (record: Terminal) => (
        <Space size="middle">
          <Tooltip title="查看详情">
            <Button 
              type="link" 
              icon={<InfoCircleOutlined />} 
              size="small"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个终端设备吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="是"
            cancelText="否"
          >
            <Button 
              type="primary" 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="terminals-page-container">
          {/* 统计卡片 */}
          <div className="terminals-stats-section">
            <div className="terminals-stat-card total-card">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-value">{totalTerminals}</div>
                  <div className="stat-label">总终端数</div>
                </div>
                <div className="stat-icon total-terminals">
                  <DesktopOutlined />
                </div>
              </div>
            </div>
            
            <div className="terminals-stat-card active-card">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-value">{connectedTerminals}</div>
                  <div className="stat-label">已关联终端</div>
                </div>
                <div className="stat-icon active-terminals">
                  <ShopOutlined />
                </div>
              </div>
            </div>
            
            <div className="terminals-stat-card today-card">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-value">{todayTerminals}</div>
                  <div className="stat-label">今日新增</div>
                </div>
                <div className="stat-icon today-terminals">
                  <PlusOutlined />
                </div>
              </div>
            </div>
            
            <div className="terminals-stat-card rate-card">
              <div className="stat-card-content">
                <div className="stat-info">
                  <div className="stat-value">
                    {mostCommonType !== 'none' ? deviceTypeStats[mostCommonType] : 0}
                  </div>
                  <div className="stat-label">最常用设备类型</div>
                </div>
                <div className="stat-icon online-rate">
                  <DesktopOutlined />
                </div>
              </div>
            </div>
          </div>



          {/* 终端设备表格 */}
          <div className="terminals-table-container">

          {/* 搜索和操作区域 */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px 32px',
              marginBottom: '24px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(102, 126, 234, 0.1)'
            }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={12} md={10} lg={8}>
                  <Search
                    placeholder="搜索终端设备ID、创建用户..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    size="large"
                    prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
                    style={{ borderRadius: '12px' }}
                  />
                </Col>
                <Col xs={12} sm={8} md={8} lg={10}>
                  <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                    共找到 {filteredTerminals.length} 个终端
                  </Text>
                </Col>
                <Col xs={12} sm={4} md={6} lg={6} style={{ textAlign: 'right' }}>
                  <Space>
                    <Button 
                      icon={<DownloadOutlined />}
                      onClick={handleExport}
                      disabled={terminals.length === 0}
                      style={{ borderRadius: '8px' }}
                    >
                      导出数据
                    </Button>
                    <Button 
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingTerminal(null);
                        form.resetFields();
                        setIsModalVisible(true);
                      }}
                      style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        fontWeight: 600,
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                      }}
                    >
                      新增终端设备
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>

            <Table
              columns={columns}
              dataSource={filteredTerminals}
              rowKey="id"
              loading={loading}
              className="modern-table"
              pagination={{
                total: filteredTerminals.length,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                pageSizeOptions: ['10', '20', '50', '100'],
              }}
            />
          </div>

          {/* 编辑/新增模态框 */}
          <Modal
            title={editingTerminal ? '编辑终端设备' : '新增终端设备'}
            open={isModalVisible}
            onCancel={() => {
              setIsModalVisible(false);
              form.resetFields();
              setEditingTerminal(null);
            }}
            footer={null}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="设备名称"
                    name="device_name"
                    rules={[
                      { required: true, message: '请输入设备名称' }
                    ]}
                  >
                    <Input placeholder="请输入设备名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="设备类型"
                    name="device_type"
                    rules={[
                      { required: true, message: '请选择设备类型' }
                    ]}
                  >
                    <Select placeholder="请选择设备类型">
                      <Select.Option value="phone">手机</Select.Option>
                      <Select.Option value="tablet">平板电脑</Select.Option>
                      <Select.Option value="laptop">笔记本电脑</Select.Option>
                      <Select.Option value="desktop">台式电脑</Select.Option>
                      <Select.Option value="pos">POS终端</Select.Option>
                      <Select.Option value="kiosk">自助终端</Select.Option>
                      <Select.Option value="other">其他</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="品牌"
                    name="brand"
                  >
                    <Input placeholder="例如: Samsung, Apple, Huawei" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="制造商"
                    name="manufacturer"
                  >
                    <Input placeholder="设备制造商" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="型号"
                    name="model_name"
                  >
                    <Input placeholder="设备型号" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="用途"
                    name="purposes"
                  >
                    <Select placeholder="请选择用途">
                      <Select.Option value="interaction">交互</Select.Option>
                      <Select.Option value="carousel">轮播</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="操作系统"
                    name="os_name"
                  >
                    <Select placeholder="请选择操作系统">
                      <Select.Option value="Android">Android</Select.Option>
                      <Select.Option value="iOS">iOS</Select.Option>
                      <Select.Option value="Windows">Windows</Select.Option>
                      <Select.Option value="macOS">macOS</Select.Option>
                      <Select.Option value="Linux">Linux</Select.Option>
                      <Select.Option value="其他">其他</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="系统版本"
                    name="os_version"
                  >
                    <Input placeholder="例如: 13.0, 11.0, iOS 16.1" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="内存"
                    name="total_memory"
                  >
                    <Input placeholder="例如: 4GB, 8GB, 16GB" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="CPU架构"
                    name="supported_cpu_architectures"
                  >
                    <Input placeholder="例如: arm64-v8a, x86_64" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Android ID"
                    name="android_id"
                  >
                    <Input placeholder="Android设备唯一标识符" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="关联精品店"
                    name="authorized_boutique"
                  >
                    <Select 
                      placeholder="请选择关联的精品店"
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        option?.label?.toString().toLowerCase().includes(input.toLowerCase()) || false
                      }
                    >
                      {boutiques.map((boutique) => (
                        <Select.Option key={boutique.id} value={boutique.id}>
                          {boutique.name} ({boutique.code})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right', marginTop: 24 }}>
                <Space>
                  <Button onClick={() => {
                    setIsModalVisible(false);
                    form.resetFields();
                    setEditingTerminal(null);
                  }}>
                    取消
                  </Button>
                  <Button type="primary" htmlType="submit">
                    {editingTerminal ? '更新' : '创建'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>

          {/* 详情查看Modal */}
          <Modal
            title={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <DesktopOutlined style={{ marginRight: 8 }} />
                终端设备详情
              </div>
            }
            open={detailModalVisible}
            onCancel={() => {
              setDetailModalVisible(false);
              setViewingTerminal(null);
            }}
            footer={[
              <Button key="close" onClick={() => setDetailModalVisible(false)}>
                关闭
              </Button>
            ]}
            width={800}
          >
            {viewingTerminal && (
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="设备ID" span={2}>
                  <Tag color="blue">{viewingTerminal.id}</Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label="设备名称">
                  {viewingTerminal.device_name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="设备类型">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {getDeviceIcon(viewingTerminal.device_type)}
                    <span style={{ marginLeft: 8 }}>
                      {viewingTerminal.device_type || '-'}
                    </span>
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label="品牌">
                  {viewingTerminal.brand || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="制造商">
                  {viewingTerminal.manufacturer || '-'}
                </Descriptions.Item>

                <Descriptions.Item label="型号">
                  {viewingTerminal.model_name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="用途">
                  {viewingTerminal.purposes ? (
                    <Tag color="cyan">{getPurposeLabel(viewingTerminal.purposes)}</Tag>
                  ) : '-'}
                </Descriptions.Item>

                <Descriptions.Item label="操作系统">
                  {viewingTerminal.os_name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="系统版本">
                  {viewingTerminal.os_version || '-'}
                </Descriptions.Item>

                <Descriptions.Item label="内存">
                  {viewingTerminal.total_memory || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="CPU架构">
                  {viewingTerminal.supported_cpu_architectures || '-'}
                </Descriptions.Item>

                <Descriptions.Item label="Android ID" span={2}>
                  {viewingTerminal.android_id || '-'}
                </Descriptions.Item>

                <Descriptions.Item label="关联精品店" span={2}>
                  {viewingTerminal.authorized_boutique ? (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <ShopOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                      <strong>{viewingTerminal.authorized_boutique.name}</strong>
                      <Tag color="processing" style={{ marginLeft: 8 }}>
                        {viewingTerminal.authorized_boutique.code}
                      </Tag>
                    </div>
                  ) : (
                    <Tag color="default">未关联</Tag>
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="创建用户">
                  <div>
                    <UserOutlined style={{ marginRight: 4 }} />
                    {viewingTerminal.user_created?.last_name}{viewingTerminal.user_created?.first_name}
                    <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
                      {viewingTerminal.user_created?.email}
                    </div>
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  <div>
                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                    {viewingTerminal.date_created 
                      ? dayjs(viewingTerminal.date_created).format('YYYY-MM-DD HH:mm:ss')
                      : '-'
                    }
                  </div>
                </Descriptions.Item>

                {viewingTerminal.date_updated && (
                  <Descriptions.Item label="最后更新" span={2}>
                    <div>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {dayjs(viewingTerminal.date_updated).format('YYYY-MM-DD HH:mm:ss')}
                    </div>
                  </Descriptions.Item>
                )}
              </Descriptions>
            )}
          </Modal>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}