'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  Button,
  Space,
  Typography,
  Card,
  Input,
  Select,
  message,
  Modal,
  Tag,
  Avatar,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Dropdown,
  Badge
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  MoreOutlined,
  UserAddOutlined,
  LockOutlined,
  UnlockOutlined,
  MailOutlined,
  GlobalOutlined,
  CrownOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { ProtectedRoute } from '@components/auth';
import { AdminLayout } from '@components/layout';
import SystemApolloProvider from '@providers/SystemApolloProvider';
import { 
  useGetAllSystemUsersQuery,
  useGetSystemUsersCountQuery,
  useDeleteSystemUserMutation,
  useToggleSystemUserStatusMutation
} from '@generated/system-graphql';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title } = Typography;
const { Option } = Select;

// 添加全局样式
const globalStyles = `
.user-table-row:hover {
  background-color: #fafafa !important;
}

.user-table-row td {
  border-bottom: 1px solid #f5f5f5 !important;
}

.ant-table-thead > tr > th {
  background-color: #fafafa !important;
  border-bottom: 2px solid #f0f0f0 !important;
  color: #262626 !important;
  font-weight: 600 !important;
  font-size: 13px !important;
}

.ant-table-tbody > tr:last-child > td {
  border-bottom: none !important;
}

.ant-pagination {
  margin-top: 20px !important;
  padding: 0 8px !important;
}

.ant-select-selector, .ant-input {
  border-radius: 8px !important;
}

.ant-btn {
  border-radius: 8px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.ant-btn-primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4) !important;
}

.ant-btn:not(.ant-btn-primary):hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = globalStyles;
  if (!document.head.querySelector('style[data-user-management]')) {
    styleElement.setAttribute('data-user-management', 'true');
    document.head.appendChild(styleElement);
  }
}

// 用户状态映射
const USER_STATUS = {
  active: { text: '活跃', color: 'green' },
  inactive: { text: '未激活', color: 'orange' },
  suspended: { text: '暂停', color: 'red' },
  archived: { text: '归档', color: 'default' }
};

// 角色图标映射
const ROLE_ICONS = {
  administrator: <CrownOutlined style={{ color: '#FFD700' }} />,
  user: <UserOutlined style={{ color: '#1890FF' }} />,
  moderator: <TeamOutlined style={{ color: '#52C41A' }} />
};

// 获取角色图标
const getRoleIcon = (roleName: string) => {
  const normalizedRole = roleName?.toLowerCase();
  if (normalizedRole?.includes('admin')) {
    return <CrownOutlined style={{ color: '#FFD700' }} />;
  } else if (normalizedRole?.includes('moderator') || normalizedRole?.includes('manager')) {
    return <TeamOutlined style={{ color: '#52C41A' }} />;
  } else {
    return <UserOutlined style={{ color: '#1890FF' }} />;
  }
};

function UsersManagement() {
  const router = useRouter();
  
  // 状态管理
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [currentPage, setCCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // GraphQL hooks
  const { 
    data: usersData, 
    loading: usersLoading, 
    error: usersError,
    refetch: refetchUsers 
  } = useGetAllSystemUsersQuery({
    variables: {
      filter: {
        ...(searchText && {
          _or: [
            { last_name: { _icontains: searchText } },
            { first_name: { _icontains: searchText } },
            { email: { _icontains: searchText } }
          ]
        }),
        ...(statusFilter && { status: { _eq: statusFilter } })
      },
      sort: ['-last_access'],
      limit: pageSize,
      offset: (currentPage - 1) * pageSize
    }
  });

  const { data: countData } = useGetSystemUsersCountQuery({
    variables: {
      filter: {
        ...(searchText && {
          _or: [
            { last_name: { _icontains: searchText } },
            { first_name: { _icontains: searchText } },
            { email: { _icontains: searchText } }
          ]
        }),
        ...(statusFilter && { status: { _eq: statusFilter } })
      }
    }
  });

  const [deleteUser] = useDeleteSystemUserMutation();
  const [toggleUserStatus] = useToggleSystemUserStatusMutation();

  // 检查删除权限
  const checkDeletePermission = useCallback((record: any) => {
    // 不能删除自己
    // 注意：这里需要根据实际的当前用户ID来判断
    // 暂时通过其他方式判断，比如超级管理员角色等
    
    // 如果是超级管理员或创建者，可能不允许删除
    if (record.role?.name === 'Administrator' || record.role?.admin_access === true) {
      return {
        canDelete: false,
        reason: '不能删除管理员用户'
      };
    }
    
    return {
      canDelete: true,
      reason: ''
    };
  }, []);

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    setCCurrentPage(1);
  }, []);

  // 处理筛选
  const handleStatusFilter = useCallback((value: string) => {
    setStatusFilter(value === 'all' ? undefined : value);
    setCCurrentPage(1);
  }, []);

  const handleRoleFilter = useCallback((value: string) => {
    setRoleFilter(value === 'all' ? undefined : value);
    setCCurrentPage(1);
  }, []);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    refetchUsers();
    message.success('数据已刷新');
  }, [refetchUsers]);

  // 删除用户
  const handleDeleteUser = useCallback(async (userId: string, userName: string) => {
    try {
      console.log('正在删除用户:', { userId, userName });
      await deleteUser({
        variables: { id: userId }
      });
      message.success(`用户 "${userName}" 删除成功`);
    } catch (error: any) {
      console.error('删除用户失败:', error);
      message.error(`删除用户失败: ${error.message || '未知错误'}`);
    }
  }, [deleteUser]);

  // 切换用户状态
  const handleToggleStatus = useCallback(async (userId: string, currentStatus: string, userName: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await toggleUserStatus({
        variables: { 
          id: userId, 
          status: newStatus 
        }
      });
      message.success(`用户 "${userName}" 状态已更新`);
      refetchUsers();
    } catch (error) {
      console.error('更新用户状态失败:', error);
      message.error('更新用户状态失败');
    }
  }, [toggleUserStatus, refetchUsers]);

  // 表格列配置
  const columns = [
    {
      title: '用户信息',
      dataIndex: 'user',
      key: 'user',
      width: 280,
      fixed: 'left' as const,
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar 
            src={record.avatar?.id ? `/api/assets/${record.avatar.id}` : undefined}
            icon={<UserOutlined />}
            size={48}
            style={{
              backgroundColor: !record.avatar?.id ? '#f0f0f0' : undefined,
              color: !record.avatar?.id ? '#666' : undefined,
              border: '2px solid #f5f5f5'
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontWeight: 600, 
              fontSize: '14px',
              color: '#262626',
              marginBottom: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
               {record.last_name}{record.first_name}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#8c8c8c',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <MailOutlined style={{ marginRight: '4px' }} />
              {record.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 140,
      render: (_: any, record: any) => {
        const role = record.role;
        if (!role) {
          return (
            <Tag 
              style={{ 
                borderRadius: '16px',
                fontSize: '12px',
                padding: '2px 12px',
                border: 'none',
                background: '#f5f5f5',
                color: '#8c8c8c'
              }}
            >
              无角色
            </Tag>
          );
        }
        
        const roleColors = {
          'administrator': '#ff4d4f',
          'admin': '#ff4d4f', 
          'manager': '#faad14',
          'moderator': '#52c41a',
          'user': '#1890ff'
        };
        
        const roleName = role.name?.toLowerCase() || '';
        let roleColor = '#1890ff';
        
        Object.entries(roleColors).forEach(([key, color]) => {
          if (roleName.includes(key)) {
            roleColor = color;
          }
        });
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getRoleIcon(role.name)}
            <Tag 
              color={roleColor}
              style={{ 
                borderRadius: '16px',
                fontSize: '12px',
                padding: '2px 12px',
                border: 'none'
              }}
            >
              {role.name}
            </Tag>
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = USER_STATUS[status as keyof typeof USER_STATUS] || 
                           { text: status, color: 'default' };
        
        const statusStyles = {
          active: { backgroundColor: '#f6ffed', color: '#52c41a', borderColor: '#b7eb8f' },
          inactive: { backgroundColor: '#fff7e6', color: '#faad14', borderColor: '#ffd591' },
          suspended: { backgroundColor: '#fff2f0', color: '#ff4d4f', borderColor: '#ffccc7' },
          archived: { backgroundColor: '#f5f5f5', color: '#8c8c8c', borderColor: '#d9d9d9' }
        };
        
        const style = statusStyles[status as keyof typeof statusStyles] || statusStyles.archived;
        
        return (
          <Tag 
            style={{ 
              borderRadius: '12px',
              fontSize: '12px',
              padding: '4px 12px',
              border: `1px solid ${style.borderColor}`,
              backgroundColor: style.backgroundColor,
              color: style.color,
              fontWeight: 500
            }}
          >
            {statusConfig.text}
          </Tag>
        );
      },
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 100,
      render: (language: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#595959' }}>
          <GlobalOutlined style={{ fontSize: '14px' }} />
          <span style={{ fontSize: '13px' }}>{language || 'N/A'}</span>
        </div>
      ),
    },
    {
      title: '最后访问',
      dataIndex: 'last_access',
      key: 'last_access',
      width: 160,
      render: (date: string) => (
        <div style={{ fontSize: '13px', color: '#595959' }}>
          {date ? (
            <Tooltip title={dayjs(date).format('YYYY年MM月DD日 HH:mm:ss')}>
              {dayjs(date).fromNow()}
            </Tooltip>
          ) : (
            <span style={{ color: '#bfbfbf' }}>从未访问</span>
          )}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        const deletePermission = checkDeletePermission(record);
        
        const dropdownItems = [
          {
            key: 'view',
            icon: <UserOutlined />,
            label: '查看详情',
            onClick: () => router.push(`/users/${record.id}`)
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: '编辑用户',
            onClick: () => router.push(`/users/${record.id}?mode=edit`)
          },
          {
            type: 'divider' as const
          },
          {
            key: 'toggle-status',
            icon: record.status === 'active' ? <LockOutlined /> : <UnlockOutlined />,
            label: record.status === 'active' ? '暂停用户' : '激活用户',
            onClick: () => handleToggleStatus(record.id, record.status, 
              `${record.last_name}${record.first_name}`)
          }
        ];

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button 
              type="text" 
              size="small" 
              icon={<UserOutlined />}
              onClick={() => router.push(`/users/${record.id}`)}
              style={{
                color: '#1890ff',
                padding: '4px 8px',
                height: '28px',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            >
              查看
            </Button>
            
            <Popconfirm
              title="确定要删除这个用户吗?"
              description={`删除用户 "${record.last_name}${record.first_name}" 后将无法恢复，请谨慎操作。`}
              onConfirm={() => {
                console.log('=== Popconfirm 确认删除 ===', {
                  userId: record.id,
                  userName: `${record.last_name}${record.first_name}`
                });
                handleDeleteUser(record.id, `${record.last_name}${record.first_name}`);
              }}
              onCancel={() => {
                console.log('=== Popconfirm 取消删除 ===');
              }}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              disabled={!checkDeletePermission(record).canDelete}
            >
              <Button 
                type="text" 
                size="small" 
                danger
                icon={<DeleteOutlined />}
                disabled={!checkDeletePermission(record).canDelete}
                title={!checkDeletePermission(record).canDelete ? checkDeletePermission(record).reason : '删除用户'}
                style={{
                  color: !checkDeletePermission(record).canDelete ? '#d9d9d9' : '#ff4d4f',
                  padding: '4px 8px',
                  height: '28px',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                onClick={(e) => {
                  console.log('=== 点击删除按钮（Popconfirm） ===', {
                    userId: record.id,
                    userName: `${record.last_name}${record.first_name}`
                  });
                }}
              >
                删除
              </Button>
            </Popconfirm>
            
            <Dropdown
              menu={{ items: dropdownItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button 
                type="text" 
                size="small" 
                icon={<MoreOutlined />} 
                style={{
                  color: '#8c8c8c',
                  padding: '4px',
                  height: '28px',
                  width: '28px',
                  borderRadius: '6px'
                }}
              />
            </Dropdown>
          </div>
        );
      },
    },
  ];

  // 处理错误状态
  if (usersError) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Typography.Text type="danger">
            加载用户数据失败: {usersError.message}
          </Typography.Text>
          <br />
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            style={{ marginTop: 16 }}
          >
            重试
          </Button>
        </div>
      </Card>
    );
  }

  const users = usersData?.users || [];
  const totalCount = countData?.users_aggregated?.[0]?.countAll || 0;

  return (
    <div style={{ 
      padding: '24px', 
      background: '#f5f5f5', 
      minHeight: '100vh' 
    }}>
      {/* 筛选和搜索区域 */}
      <Card 
        style={{ 
          marginBottom: '24px',
          borderRadius: '12px',
          border: '1px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6} lg={5}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c', fontWeight: 500 }}>
              搜索用户
            </div>
            <Input.Search
              placeholder="输入用户名或邮箱地址..."
              allowClear
              onSearch={handleSearch}
              onChange={(e) => {
                if (!e.target.value) {
                  handleSearch('');
                }
              }}
              style={{ 
                width: '100%',
                borderRadius: '8px'
              }}
              size="middle"
            />
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c', fontWeight: 500 }}>
              用户状态
            </div>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              onChange={handleStatusFilter}
              value={statusFilter}
              size="middle"
            >
              <Option value="all">全部状态</Option>
              <Option value="active">
                <Badge status="success" text="活跃用户" />
              </Option>
              <Option value="inactive">
                <Badge status="warning" text="未激活" />
              </Option>
              <Option value="suspended">
                <Badge status="error" text="已暂停" />
              </Option>
              <Option value="archived">
                <Badge status="default" text="已归档" />
              </Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4} lg={3}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: '#8c8c8c', fontWeight: 500 }}>
              用户角色
            </div>
            <Select
              placeholder="选择角色"
              allowClear
              style={{ width: '100%' }}
              onChange={handleRoleFilter}
              value={roleFilter}
              size="middle"
            >
              <Option value="all">全部角色</Option>
              <Option value="administrator">
                <Space>
                  <CrownOutlined style={{ color: '#ff4d4f' }} />
                  管理员
                </Space>
              </Option>
              <Option value="user">
                <Space>
                  <UserOutlined style={{ color: '#1890ff' }} />
                  普通用户
                </Space>
              </Option>
              <Option value="moderator">
                <Space>
                  <TeamOutlined style={{ color: '#52c41a' }} />
                  审核员
                </Space>
              </Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={10} lg={13}>
            <div style={{ marginBottom: '4px', fontSize: '12px', color: 'transparent' }}>
              .
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              gap: '12px',
              fontSize: '13px',
              color: '#8c8c8c'
            }}>
              <span>共找到 {totalCount} 位用户</span>
              <Space size="middle">
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={usersLoading}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #d9d9d9',
                    background: '#fff'
                  }}
                >
                  刷新
                </Button>
                <Button 
                  type="primary" 
                  icon={<UserAddOutlined />}
                  onClick={() => router.push('/users/create')}
                  style={{
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  添加用户
                </Button>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 用户列表 */}
      <Card style={{
        borderRadius: '12px',
        border: '1px solid #f0f0f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden'
      }}>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={usersLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalCount,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条`,
            onChange: (page, size) => {
              setCCurrentPage(page);
              if (size !== pageSize) {
                setPageSize(size);
              }
            },
            onShowSizeChange: (current, size) => {
              setCCurrentPage(1);
              setPageSize(size);
            },
            style: { padding: '16px 0 0 0' }
          }}
          scroll={{ x: 1000 }}
          size="middle"
          style={{
            borderRadius: '8px'
          }}
          rowClassName={() => 'user-table-row'}
        />
      </Card>
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <SystemApolloProvider>
        <AdminLayout>
          <UsersManagement />
        </AdminLayout>
      </SystemApolloProvider>
    </ProtectedRoute>
  );
}