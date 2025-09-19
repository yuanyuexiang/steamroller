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
  Typography, 
  message, 
  Tag, 
  Popconfirm,
  Row,
  Col,
  Statistic,
  DatePicker
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  DesktopOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { 
  useGetAllTerminalsQuery,
  useCreateTerminalMutation,
  useUpdateTerminalMutation,
  useDeleteTerminalMutation,
  GetAllTerminalsQuery
} from '../../generated/graphql';
import { ProtectedRoute, AdminLayout } from '@components';
import { exportTerminals } from '@lib/utils';
import dayjs from 'dayjs';

const { Title } = Typography;

type Terminal = NonNullable<GetAllTerminalsQuery['terminals'][0]>;

export default function TerminalsPage() {
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [form] = Form.useForm();

  // 查询终端设备（超级管理员权限 - 查看所有终端）
  const { data: terminalsData, loading, refetch } = useGetAllTerminalsQuery();
  const terminals = terminalsData?.terminals || [];

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

  // 过滤终端设备
  const filteredTerminals = terminals.filter(terminal => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      terminal.id.toLowerCase().includes(searchLower) ||
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
  const activeTerminals = terminals.filter(t => t.date_created).length;
  const todayTerminals = terminals.filter(t => 
    t.date_created && dayjs(t.date_created).isAfter(dayjs().startOf('day'))
  ).length;

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    try {
      if (editingTerminal) {
        await updateTerminal({
          variables: {
            id: editingTerminal.id,
            data: {
              ...values
            }
          }
        });
      } else {
        await createTerminal({
          variables: {
            data: {
              ...values
            }
          }
        });
      }
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  // 处理编辑
  const handleEdit = (terminal: Terminal) => {
    setEditingTerminal(terminal);
    form.setFieldsValue({
      // Terminal 目前只有基础字段，可以根据需要扩展
    });
    setIsModalVisible(true);
  };

  // 处理删除
  const handleDelete = async (id: string) => {
    try {
      await deleteTerminal({
        variables: { id }
      });
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  // 表格列定义
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
      title: '创建用户',
      key: 'user_created',
      width: 200,
      render: (record: Terminal) => (
        <div>
          <div>
            <UserOutlined /> {record.user_created?.first_name} {record.user_created?.last_name}
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
      title: '更新时间',
      dataIndex: 'date_updated',
      key: 'date_updated',
      width: 180,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: Terminal) => (
        <Space size="middle">
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
                  <div className="stat-value">{activeTerminals}</div>
                  <div className="stat-label">活跃终端</div>
                </div>
                <div className="stat-icon active-terminals">
                  <ClockCircleOutlined />
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
                    {(totalTerminals > 0 ? ((activeTerminals / totalTerminals) * 100) : 0).toFixed(1)}%
                  </div>
                  <div className="stat-label">在线率</div>
                </div>
                <div className="stat-icon online-rate">
                  <DesktopOutlined />
                </div>
              </div>
            </div>
          </div>

          {/* 操作栏 */}
          <div className="terminals-toolbar">
            <div className="toolbar-left">
              <h2 className="page-title">终端设备管理</h2>
              <p className="page-desc">管理和监控所有终端设备状态</p>
            </div>
            <div className="toolbar-right">
              <Input.Search
                placeholder="搜索终端设备ID、创建用户..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input"
                allowClear
              />
              <Button 
                className="export-btn"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                disabled={terminals.length === 0}
              >
                导出数据
              </Button>
              <Button 
                type="primary" 
                className="add-btn"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingTerminal(null);
                  form.resetFields();
                  setIsModalVisible(true);
                }}
              >
                新增终端设备
              </Button>
            </div>
          </div>

          {/* 终端设备表格 */}
          <div className="terminals-table-container">
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
              <Form.Item
                label="设备信息"
                name="info"
                rules={[
                  { required: false, message: '请输入设备信息' }
                ]}
              >
                <Input.TextArea 
                  placeholder="请输入设备相关信息（可选）"
                  rows={3}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setIsModalVisible(false)}>
                    取消
                  </Button>
                  <Button type="primary" htmlType="submit">
                    {editingTerminal ? '更新' : '创建'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}