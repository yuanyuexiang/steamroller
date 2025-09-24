'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  Form,
  Input,
  Select,
  Switch,
  Button,
  Card,
  Typography,
  Row,
  Col,
  message,
  Modal,
  Avatar,
  Upload,
  Spin,
  Divider,
  Space,
  Tag,
  Tooltip,
  Badge,
  Alert,
  Tabs,
  Progress,
  Statistic,
  List
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UserOutlined,
  UploadOutlined,
  LoadingOutlined,
  MailOutlined,
  LockOutlined,
  GlobalOutlined,
  SettingOutlined,
  SafetyOutlined,
  TeamOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  InfoCircleOutlined,
  EditOutlined
} from '@ant-design/icons';
import { ProtectedRoute } from '@components/auth';
import { AdminLayout } from '@components/layout';
import SystemApolloProvider from '@providers/SystemApolloProvider';
import { 
  useGetSystemUserByIdQuery,
  useGetAllSystemRolesQuery,
  useGetAllSystemPoliciesQuery,
  useCreateSystemUserMutation,
  useUpdateSystemUserMutation
} from '@generated/system-graphql';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;
const { Option } = Select;

// 全局样式
const globalStyles = `
.user-edit-container {
  background: #f5f5f5;
  min-height: 100vh;
}

.user-edit-form .ant-form-item-label > label {
  font-weight: 600;
  color: #262626;
  font-size: 14px;
}

.user-edit-tabs .ant-tabs-nav {
  margin-bottom: 24px;
  border-bottom: 2px solid #f0f0f0;
  background: white;
  border-radius: 12px 12px 0 0;
  padding: 0 24px;
}

.user-edit-tabs .ant-tabs-tab {
  padding: 16px 24px;
  font-weight: 500;
  font-size: 15px;
}

.user-edit-tabs .ant-tabs-tab-active {
  color: #667eea;
  border-color: #667eea;
}

.user-card-shadow {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
  border-radius: 12px;
}

.gradient-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.user-info-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 8px;
}

.edit-mode-badge {
  background: linear-gradient(135deg, #ff7875 0%, #ff4d4f 100%);
  color: white;
  border: none;
}

.view-mode-badge {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  color: white;
  border: none;
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = globalStyles;
  if (!document.head.querySelector('style[data-user-edit]')) {
    styleElement.setAttribute('data-user-edit', 'true');
    document.head.appendChild(styleElement);
  }
}

// 用户状态选项
const USER_STATUS_OPTIONS = [
  { value: 'active', label: '活跃', color: '#52C41A' },
  { value: 'invited', label: '已邀请', color: '#1890FF' },
  { value: 'draft', label: '草稿', color: '#8B5CF6' },
  { value: 'suspended', label: '已暂停', color: '#FF4D4F' },
  { value: 'archived', label: '已归档', color: '#8C8C8C' }
];

// 语言选项
const LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' }
];

// 主题选项
const APPEARANCE_OPTIONS = [
  { value: 'auto', label: '跟随系统' },
  { value: 'light', label: '浅色模式' },
  { value: 'dark', label: '深色模式' }
];

function UserEditContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null);

  const isNew = params?.id === 'create';
  const isEditMode = searchParams?.get('mode') === 'edit';
  const userId = isNew ? null : params?.id as string;
  const isViewMode = !isNew && !isEditMode;

  // GraphQL 查询
  const { 
    data: userData, 
    loading: userLoading, 
    error: userError,
    refetch: refetchUser
  } = useGetSystemUserByIdQuery({
    variables: { id: userId! },
    skip: isNew
  });

  const { data: rolesData, loading: rolesLoading } = useGetAllSystemRolesQuery({
    variables: { sort: ['name'] }
  });

  const { data: policiesData } = useGetAllSystemPoliciesQuery({
    variables: { sort: ['name'] }
  });

  const [createUser] = useCreateSystemUserMutation();
  const [updateUser] = useUpdateSystemUserMutation();

  const user = userData?.users_by_id;
  const roles = rolesData?.roles || [];

  // 表单初始化
  useEffect(() => {
    if (user && !isNew) {
      console.log('初始化编辑表单，用户数据:', user);
      form.setFieldsValue({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email, // 设置当前邮箱值，即使字段被禁用
        status: user.status,
        title: user.title,
        location: user.location,
        description: user.description,
        role: user.role?.id,
        language: user.language,
        appearance: user.appearance,
        email_notifications: user.email_notifications
      });
    } else if (isNew) {
      console.log('初始化新建表单');
      // 新用户的默认值
      form.setFieldsValue({
        status: 'active',
        language: 'zh-CN',
        appearance: 'auto',
        email_notifications: true
      });
    }
  }, [user, form, isNew]);

  // 保存用户数据
  const handleSave = async () => {
    try {
      setLoading(true);
      
      // 先进行表单验证
      console.log('开始表单验证...');
      const values = await form.validateFields();
      console.log('表单验证成功，获得的值:', values);
      
      // 构建用户数据
      const userData: any = {
        first_name: values.first_name,
        last_name: values.last_name,
        status: values.status,
        title: values.title || null,
        location: values.location || null,
        description: values.description || null,
        language: values.language,
        appearance: values.appearance,
        email_notifications: values.email_notifications,
        ...(values.password && { password: values.password })
      };

      // 只在新建用户时包含邮箱
      if (isNew && values.email) {
        userData.email = values.email;
      }

      console.log('保存用户数据:', userData);

      if (isNew) {
        const result = await createUser({
          variables: { data: userData }
        });
        
        // 如果有角色，创建成功后更新角色
        if (values.role && result.data?.create_users_item?.id) {
          await updateUser({
            variables: { 
              id: result.data.create_users_item.id, 
              data: { role: { id: values.role } } 
            }
          });
        }
        
        // 显示创建成功的详细信息
        Modal.success({
          title: '用户创建成功',
          content: (
            <div>
              <p>新用户已成功创建，请将以下登录信息告知用户：</p>
              <div style={{ 
                background: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '6px', 
                marginTop: '12px',
                fontFamily: 'monospace'
              }}>
                <p style={{ margin: '4px 0' }}>
                  <strong>邮箱：</strong>{values.email}
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>密码：</strong>{values.password || '123456'}
                </p>
              </div>
              <p style={{ marginTop: '12px', fontSize: '12px', color: '#8c8c8c' }}>
                建议用户首次登录后立即修改密码
              </p>
            </div>
          ),
          width: 480,
          onOk: () => {
            router.replace('/users');
          }
        });
      } else {
        // 构建更新数据，处理角色字段
        const updateData = { ...userData };
        if (values.role) {
          updateData.role = { id: values.role };
        }
        
        await updateUser({
          variables: {
            id: userId!,
            data: updateData
          }
        });
        message.success('用户更新成功');
        refetchUser();
        if (isEditMode) {
          router.replace(`/users/${userId}`);
        }
      }
    } catch (error: any) {
      console.error('保存用户失败:', error);
      
      // 如果是表单验证错误，显示具体的验证错误信息
      if (error.errorFields && Array.isArray(error.errorFields)) {
        const errorMessages = error.errorFields.map((field: any) => {
          return `${field.name?.[0] || '字段'}: ${field.errors?.[0] || '验证失败'}`;
        }).join('; ');
        message.error(`表单验证失败: ${errorMessages}`);
      } else if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        // GraphQL 错误
        const graphQLError = error.graphQLErrors[0];
        message.error(`保存失败: ${graphQLError.message}`);
      } else if (error.networkError) {
        // 网络错误
        message.error('网络错误，请检查网络连接');
      } else {
        // 其他错误
        message.error(error.message || '保存用户失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 计算用户完整度
  const calculateProfileCompleteness = () => {
    if (!user && !isNew) return 0;
    
    const fields = [
      'first_name', 'last_name', 'email', 'role', 'status'
    ];
    const optionalFields = [
      'title', 'location', 'description', 'avatar'
    ];
    
    let completedFields = 0;
    const totalFields = fields.length + optionalFields.length;
    
    // 必填字段
    fields.forEach(field => {
      if (user?.[field as keyof typeof user] || form.getFieldValue(field)) {
        completedFields++;
      }
    });
    
    // 可选字段
    optionalFields.forEach(field => {
      if (user?.[field as keyof typeof user] || form.getFieldValue(field)) {
        completedFields++;
      }
    });
    
    return Math.round((completedFields / totalFields) * 100);
  };

  const completeness = calculateProfileCompleteness();

  // 基本信息表单
  const renderBasicForm = () => (
    <Card 
      className="user-card-shadow" 
      style={{ marginBottom: '24px' }}
    >
      <div style={{ marginBottom: '24px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 600, color: '#262626' }}>
          基本信息
        </Text>
        <div style={{ marginTop: '4px', color: '#8c8c8c', fontSize: '14px' }}>
          配置用户的基本身份信息
        </div>
      </div>
      
      <Row gutter={[24, 16]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="first_name"
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                名
                <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: '请输入名' }]}
          >
            <Input 
              placeholder="请输入名"
              size="large"
              disabled={isViewMode}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>
        </Col>
        
        <Col xs={24} md={12}>
          <Form.Item
            name="last_name"
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                姓
                <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: '请输入姓' }]}
          >
            <Input 
              placeholder="请输入姓"
              size="large"
              disabled={isViewMode}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>
        </Col>
        
        <Col xs={24}>
          <Form.Item
            name="email"
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MailOutlined />
                邮箱地址
                <Text type="danger">*</Text>
              </span>
            }
            rules={[
              { required: isNew, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input 
              placeholder="请输入邮箱地址"
              size="large"
              disabled={isViewMode || !isNew}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>
        </Col>
        
        <Col xs={24} md={12}>
          <Form.Item
            name="title"
            label="职位"
          >
            <Input 
              placeholder="请输入职位"
              size="large"
              disabled={isViewMode}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>
        </Col>
        
        <Col xs={24} md={12}>
          <Form.Item
            name="location"
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <GlobalOutlined />
                位置
              </span>
            }
          >
            <Input 
              placeholder="请输入位置"
              size="large"
              disabled={isViewMode}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>
        </Col>
        
        <Col xs={24}>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea 
              placeholder="请输入用户描述"
              rows={4}
              disabled={isViewMode}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  // 安全设置表单
  const renderSecurityForm = () => (
    <Card 
      className="user-card-shadow" 
      style={{ marginBottom: '24px' }}
    >
      <div style={{ marginBottom: '24px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 600, color: '#262626' }}>
          安全设置
        </Text>
        <div style={{ marginTop: '4px', color: '#8c8c8c', fontSize: '14px' }}>
          配置用户角色和安全选项
        </div>
      </div>
      
      <Row gutter={[24, 16]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="status"
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                状态
                <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select 
              placeholder="请选择状态"
              size="large"
              disabled={isViewMode}
              style={{ borderRadius: '8px' }}
            >
              {USER_STATUS_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      className="status-indicator" 
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        
        <Col xs={24} md={12}>
          <Form.Item
            name="role"
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TeamOutlined />
                角色
                <Text type="danger">*</Text>
              </span>
            }
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select 
              placeholder="请选择角色"
              size="large"
              disabled={isViewMode}
              loading={rolesLoading}
              showSearch
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ borderRadius: '8px' }}
            >
              {roles.map(role => (
                <Option key={role.id} value={role.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {role.name?.toLowerCase().includes('admin') ? (
                      <CrownOutlined style={{ color: '#ff4d4f' }} />
                    ) : (
                      <UserOutlined style={{ color: '#1890ff' }} />
                    )}
                    {role.name}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        
        {isNew && (
          <Col xs={24}>
            <Form.Item
              name="password"
              label={
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <LockOutlined />
                  初始密码
                  <Text type="danger">*</Text>
                </span>
              }
              rules={[
                { required: isNew, message: '请输入初始密码' },
                { min: 6, message: '密码长度至少6位' }
              ]}
              extra={
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    建议使用 <Text code>123456</Text> 作为初始密码，用户首次登录后可修改
                  </Text>
                  <br />
                  <Button 
                    type="link" 
                    size="small" 
                    style={{ padding: '0', height: 'auto', fontSize: '12px' }}
                    onClick={() => {
                      form.setFieldsValue({ password: '123456' });
                      message.success('已设置默认密码');
                    }}
                  >
                    使用默认密码 123456
                  </Button>
                </div>
              }
            >
              <Input.Password 
                placeholder="请输入初始密码（建议使用 123456）"
                size="large"
                style={{ borderRadius: '8px' }}
              />
            </Form.Item>
          </Col>
        )}
      </Row>
    </Card>
  );

  // 个人偏好表单
  const renderPreferencesForm = () => (
    <Card 
      className="user-card-shadow" 
      style={{ marginBottom: '24px' }}
    >
      <div style={{ marginBottom: '24px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 600, color: '#262626' }}>
          个人偏好
        </Text>
        <div style={{ marginTop: '4px', color: '#8c8c8c', fontSize: '14px' }}>
          设置用户的个人偏好和通知选项
        </div>
      </div>
      
      <Row gutter={[24, 16]}>
        <Col xs={24} md={12}>
          <Form.Item
            name="language"
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <GlobalOutlined />
                界面语言
              </span>
            }
          >
            <Select 
              placeholder="选择界面语言"
              size="large"
              disabled={isViewMode}
              style={{ borderRadius: '8px' }}
            >
              {LANGUAGE_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        
        <Col xs={24} md={12}>
          <Form.Item
            name="appearance"
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <SettingOutlined />
                主题外观
              </span>
            }
          >
            <Select 
              placeholder="选择主题外观"
              size="large"
              disabled={isViewMode}
              style={{ borderRadius: '8px' }}
            >
              {APPEARANCE_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        
        <Col xs={24}>
          <Form.Item
            name="email_notifications"
            valuePropName="checked"
            label="通知设置"
          >
            <div style={{ padding: '12px', background: '#fafafa', borderRadius: '8px' }}>
              <Switch 
                disabled={isViewMode}
                checkedChildren="开启"
                unCheckedChildren="关闭"
              />
              <span style={{ marginLeft: '12px', color: '#595959' }}>
                接收邮件通知
              </span>
              <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                开启后将接收系统重要通知和消息提醒
              </div>
            </div>
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );

  // 用户统计信息
  const renderUserStats = () => (
    <Card 
      className="user-info-card" 
      style={{ marginBottom: '24px' }}
    >
      <div style={{ textAlign: 'center' }}>
        <Avatar 
          src={user?.avatar?.id ? `/api/assets/${user.avatar.id}` : undefined}
          icon={<UserOutlined />}
          size={80}
          style={{ 
            marginBottom: '16px',
            border: '4px solid rgba(255,255,255,0.2)'
          }}
        />
        
        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
          {user ? `${user.last_name || ''}${user.first_name || ''}` : '新用户'}
        </div>
        
        <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '16px' }}>
          {user?.email || '用户邮箱'}
        </div>

        {!isNew && (
          <>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '16px 0' }} />
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.8 }}>
                资料完整度
              </div>
              <Progress
                type="circle"
                percent={completeness}
                size={60}
                strokeColor="white"
                trailColor="rgba(255,255,255,0.2)"
                format={(percent) => 
                  <span style={{ color: 'white', fontSize: '12px' }}>
                    {percent}%
                  </span>
                }
              />
            </div>
            
            <Row gutter={[16, 8]} style={{ textAlign: 'center' }}>
              <Col span={12}>
                <Statistic
                  title="最后访问"
                  value={user?.last_access ? dayjs(user.last_access).fromNow() : '从未'}
                  valueStyle={{ 
                    color: 'white', 
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                  prefix={null}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="账户状态"
                  value={USER_STATUS_OPTIONS.find(s => s.value === user?.status)?.label || '未知'}
                  valueStyle={{ 
                    color: 'white', 
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                  prefix={null}
                />
              </Col>
            </Row>
          </>
        )}
      </div>
    </Card>
  );

  if (userLoading) {
    return (
      <div className="user-edit-container" style={{ padding: '24px' }}>
        <Card className="user-card-shadow">
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px', color: '#8c8c8c' }}>
              正在加载用户数据...
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (userError && !isNew) {
    return (
      <div className="user-edit-container" style={{ padding: '24px' }}>
        <Card className="user-card-shadow">
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Alert
              message="加载失败"
              description="无法加载用户数据，请检查网络连接或稍后重试"
              type="error"
              showIcon
              style={{ marginBottom: '24px' }}
            />
            <Button 
              type="primary" 
              onClick={() => router.push('/users')}
              size="large"
            >
              返回用户列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="user-edit-container" style={{ padding: '24px' }}>
      {/* 页面头部 */}
      <Card className="user-card-shadow" style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Button 
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push('/users')}
                size="large"
                style={{ borderRadius: '8px' }}
              >
                返回
              </Button>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <Title level={3} style={{ margin: 0 }}>
                    {isNew ? '新增用户' : isEditMode ? '编辑用户' : '用户详情'}
                  </Title>
                  
                  {!isNew && (
                    <Tag className={isEditMode ? 'edit-mode-badge' : 'view-mode-badge'}>
                      {isEditMode ? '编辑模式' : '查看模式'}
                    </Tag>
                  )}
                </div>
                
                <Text style={{ color: '#8c8c8c' }}>
                  {isNew 
                    ? '创建新的系统用户账户' 
                    : `${isEditMode ? '编辑' : '查看'}用户：${user?.email}`
                  }
                </Text>
              </div>
            </div>
          </Col>
          
          <Col>
            <Space size="middle">
              {!isNew && isViewMode && (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => router.push(`/users/${userId}?mode=edit`)}
                  size="large"
                  style={{ borderRadius: '8px' }}
                >
                  编辑用户
                </Button>
              )}
              
              {(isNew || isEditMode) && (
                <>
                  <Button 
                    onClick={() => isNew ? router.push('/users') : router.replace(`/users/${userId}`)}
                    size="large"
                    style={{ borderRadius: '8px' }}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={loading}
                    onClick={handleSave}
                    size="large"
                    style={{ 
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none'
                    }}
                  >
                    保存
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要内容 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Form 
            form={form} 
            layout="vertical"
            className="user-edit-form"
            size="large"
          >
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              className="user-edit-tabs"
              size="large"
            >
              <Tabs.TabPane 
                tab={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserOutlined />
                    基本信息
                  </span>
                }
                key="basic"
              >
                {renderBasicForm()}
              </Tabs.TabPane>
              
              <Tabs.TabPane 
                tab={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SafetyOutlined />
                    安全设置
                  </span>
                }
                key="security"
              >
                {renderSecurityForm()}
              </Tabs.TabPane>
              
              {/* 暂时屏蔽个人偏好标签页，后期启用 */}
              {/* <Tabs.TabPane 
                tab={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SettingOutlined />
                    个人偏好
                  </span>
                }
                key="preferences"
              >
                {renderPreferencesForm()}
              </Tabs.TabPane> */}
            </Tabs>
          </Form>
        </Col>
        
        <Col xs={24} lg={8}>
          {renderUserStats()}
          
          {!isNew && user?.role && (
            <Card className="user-card-shadow" style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ fontSize: '16px', fontWeight: 600 }}>
                  当前角色
                </Text>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TeamOutlined style={{ color: 'white', fontSize: '20px' }} />
                </div>
                
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>
                    {user.role.name}
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: '13px' }}>
                    {user.role.description || '暂无描述'}
                  </div>
                </div>
              </div>
              
              <Tag color="blue" style={{ borderRadius: '16px' }}>
                系统角色
              </Tag>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}

export default function UserEditPage() {
  return (
    <ProtectedRoute>
      <SystemApolloProvider>
        <AdminLayout>
          <UserEditContent />
        </AdminLayout>
      </SystemApolloProvider>
    </ProtectedRoute>
  );
}