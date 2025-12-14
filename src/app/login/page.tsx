'use client';

import React from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@providers/AuthProvider';

const { Title } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [form] = Form.useForm(); // 添加Form实例
  const router = useRouter();
  const { login } = useAuth();

  const testConnection = async () => {
    setTestLoading(true);
    try {
      const response = await fetch('/api/graphql/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'query { __typename }'
        })
      });
      
      const result = await response.json();
      console.log('连接测试结果:', result);
      
      if (response.ok) {
        message.success('代理连接正常！');
      } else {
        message.error('代理连接失败！');
      }
    } catch (error) {
      console.error('连接测试失败:', error);
      message.error('连接测试失败！');
    } finally {
      setTestLoading(false);
    }
  };

  const testValidCredentials = async () => {
    setTestLoading(true);
    try {
      console.log('填入测试凭据到表单...');
      
      // 使用Form实例设置值
      form.setFieldsValue({
        email: 'tom.nanjing@gmail.com',
        password: 'sual116y'
      });
      
      message.success('已填入测试凭据，请点击登录按钮');
    } catch (error) {
      console.error('填入凭据失败:', error);
      message.error('填入凭据失败！');
    } finally {
      setTestLoading(false);
    }
  };

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    
    try {
      console.log('尝试登录:', { email: values.email });
      const success = await login(values.email, values.password);
      
      if (success) {
        message.success('登录成功！');
        router.push('/dashboard');
      }
      // 如果登录失败，AuthProvider 已经显示了具体的错误信息，这里不需要再显示
    } catch (error) {
      console.error('登录异常:', error);
      // 只在发生异常时显示错误（非预期的错误）
      message.error('登录过程发生异常，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* 左侧品牌区域 */}
      <div className="login-page-left">
        <div className="flex flex-col items-center mb-12">
          <div className="login-logo-circle">
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
              {/* 蓝色叶片 */}
              <ellipse cx="50" cy="30" rx="8" ry="25" fill="#3B82F6" transform="rotate(-30 50 50)" />
              {/* 紫色叶片 */}
              <ellipse cx="50" cy="30" rx="8" ry="25" fill="#A855F7" transform="rotate(30 50 50)" />
              {/* 绿色叶片 */}
              <ellipse cx="50" cy="30" rx="8" ry="25" fill="#10B981" transform="rotate(90 50 50)" />
              {/* 青色叶片 */}
              <ellipse cx="50" cy="30" rx="8" ry="25" fill="#06B6D4" transform="rotate(150 50 50)" />
              {/* 橙色叶片 */}
              <ellipse cx="50" cy="30" rx="8" ry="25" fill="#F59E0B" transform="rotate(210 50 50)" />
              {/* 粉色叶片 */}
              <ellipse cx="50" cy="30" rx="8" ry="25" fill="#EC4899" transform="rotate(270 50 50)" />
              {/* 中心圆 */}
              <circle cx="50" cy="50" r="6" fill="white" opacity="0.9" />
            </svg>
          </div>
          <h1 
            className="text-5xl font-light m-0"
            style={{
              textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              letterSpacing: '2px',
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #FFFFFF 0%, rgba(255, 255, 255, 0.8) 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Kaichenbao Technology
          </h1>
          <p 
            className="text-xl font-light mt-4"
            style={{ 
              color: 'rgba(255, 255, 255, 0.9)',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            实体店商品智能展销系统管理平台
          </p>
        </div>
        
        <div className="text-center max-w-lg">
          <p 
            className="text-2xl font-medium leading-relaxed mb-3"
            style={{ 
              opacity: '0.95', 
              color: '#FFFFFF',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              lineHeight: '1.6'
            }}
          >
            开拓创新，塑造未来
          </p>
          <p 
            className="text-base leading-relaxed mb-8"
            style={{ 
              opacity: '0.85', 
              color: '#FFFFFF',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              lineHeight: '1.8'
            }}
          >
            不断努力超越客户的期望，并提供卓越的终生价值。
          </p>
          <div 
            className="grid grid-cols-3 gap-6"
            style={{
              padding: '0 2rem'
            }}
          >
            <div className="text-center">
              <div 
                className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.2)'
                }}
              >
                <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-white opacity-90">高效管理</p>
            </div>
            <div className="text-center">
              <div 
                className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.2)'
                }}
              >
                <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-white opacity-90">安全可靠</p>
            </div>
            <div className="text-center">
              <div 
                className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.2)'
                }}
              >
                <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-white opacity-90">数据洞察</p>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧登录表单区域 */}
      <div className="login-page-right">
        <div className="w-full max-w-sm">
          <div className="text-center mb-12">
            <h2 
              className="text-3xl font-bold mb-3"
              style={{ 
                color: '#1F2937',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              管理员登录
            </h2>
            <p 
              className="text-base mb-2"
              style={{ color: '#6B7280' }}
            >
              系统管理员专用入口
            </p>
            <div 
              className="text-sm mb-6 p-3 rounded-lg"
              style={{ 
                backgroundColor: '#F3F4F6',
                color: '#6B7280',
                border: '1px solid #E5E7EB'
              }}
            >
              <span style={{ color: '#EF4444', fontWeight: '600' }}>⚠️ 注意：</span>
              此系统仅限具有管理员权限的用户访问
            </div>
          </div>
          
          <Form
            name="login"
            form={form}
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            size="large"
          >
            <Form.Item
              label={
                <span 
                  style={{ 
                    color: '#374151', 
                    fontWeight: '600',
                    fontSize: '15px'
                  }}
                >
                  邮箱地址
                </span>
              }
              name="email"
              rules={[
                { required: true, message: '请输入用户邮箱！' },
                { type: 'email', message: '请输入有效的邮箱格式！' }
              ]}
              style={{ marginBottom: '24px' }}
            >
              <Input 
                className="login-input-field"
                prefix={
                  <UserOutlined 
                    style={{ 
                      color: '#667eea',
                      fontSize: '16px'
                    }} 
                  />
                } 
                placeholder="输入您的邮箱地址" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              label={
                <span 
                  style={{ 
                    color: '#374151', 
                    fontWeight: '600',
                    fontSize: '15px'
                  }}
                >
                  登录密码
                </span>
              }
              name="password"
              rules={[
                { required: true, message: '请输入密码！' },
                { min: 6, message: '密码至少6位！' }
              ]}
              style={{ marginBottom: '32px' }}
            >
              <Input.Password
                className="login-input-field"
                prefix={
                  <LockOutlined 
                    style={{ 
                      color: '#667eea',
                      fontSize: '16px'
                    }} 
                  />
                }
                placeholder="输入您的登录密码"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '0' }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                className="login-submit-button w-full"
                size="large"
              >
                {loading ? '登录中...' : '立即登录'}
              </Button>
            </Form.Item>
          </Form>
          
          <div 
            className="text-center text-sm mt-10"
            style={{ color: '#9CA3AF' }}
          >
            <p>© 2025 Steamroller System. 保留所有权利</p>
          </div>
        </div>
      </div>
    </div>
  );
}
