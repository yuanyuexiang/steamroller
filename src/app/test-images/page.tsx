'use client';

import React from 'react';
import { Card, Space, Typography, Avatar, Image } from 'antd';
import { AdminLayout } from '@components/layout';
import { ProtectedRoute } from '@components/auth';
import { FILE_CONFIG } from '@lib/api';
import { IMAGE_CONFIGS } from '@config/image-configs';

const { Title, Text } = Typography;

// 测试用的图片ID（假设这些是系统中存在的图片）
const testImageId = '1'; // 使用一个通用的测试图片ID

export default function TestImagesPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <div style={{ padding: '24px' }}>
          <Title level={2}>图片优化配置测试</Title>
          
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            
            {/* 缩略图测试 */}
            <Card title="THUMBNAIL 配置 (80x80, 质量80%, WebP)" size="small">
              <Space>
                <Avatar 
                  size={40} 
                  src={FILE_CONFIG.getAssetUrl(testImageId, undefined, IMAGE_CONFIGS.THUMBNAIL)} 
                />
                <Text>40px 显示尺寸，80px 实际尺寸（适配高分辨率屏幕）</Text>
              </Space>
            </Card>

            {/* 小头像测试 */}
            <Card title="AVATAR_SMALL 配置 (64x64, 质量85%, WebP)" size="small">
              <Space>
                <Avatar 
                  size={32} 
                  src={FILE_CONFIG.getAssetUrl(testImageId, undefined, IMAGE_CONFIGS.AVATAR_SMALL)} 
                />
                <Text>32px 显示尺寸，64px 实际尺寸</Text>
              </Space>
            </Card>

            {/* 中等预览图测试 */}
            <Card title="PREVIEW_MEDIUM 配置 (160x160, 质量85%, WebP)" size="small">
              <Space>
                <Image 
                  width={80}
                  height={80}
                  src={FILE_CONFIG.getAssetUrl(testImageId, undefined, IMAGE_CONFIGS.PREVIEW_MEDIUM)} 
                  style={{ objectFit: 'cover' }}
                />
                <Text>80px 显示尺寸，160px 实际尺寸</Text>
              </Space>
            </Card>

            {/* 大预览图测试 */}
            <Card title="PREVIEW_LARGE 配置 (320x320, 质量85%, WebP)" size="small">
              <Space>
                <Image 
                  width={160}
                  height={160}
                  src={FILE_CONFIG.getAssetUrl(testImageId, undefined, IMAGE_CONFIGS.PREVIEW_LARGE)} 
                  style={{ objectFit: 'cover' }}
                />
                <Text>160px 显示尺寸，320px 实际尺寸</Text>
              </Space>
            </Card>

            {/* 排名缩略图测试 */}
            <Card title="RANKING_THUMB 配置 (96x96, 质量80%, WebP)" size="small">
              <Space>
                <Image 
                  width={48}
                  height={48}
                  src={FILE_CONFIG.getAssetUrl(testImageId, undefined, IMAGE_CONFIGS.RANKING_THUMB)} 
                  style={{ objectFit: 'cover' }}
                />
                <Text>48px 显示尺寸，96px 实际尺寸（用于Dashboard排行榜）</Text>
              </Space>
            </Card>

            {/* 店铺列表图测试 */}
            <Card title="BOUTIQUE_LIST 配置 (120x120, 质量80%, WebP)" size="small">
              <Space>
                <Image 
                  width={60}
                  height={60}
                  src={FILE_CONFIG.getAssetUrl(testImageId, undefined, IMAGE_CONFIGS.BOUTIQUE_LIST)} 
                  style={{ objectFit: 'cover' }}
                />
                <Text>60px 显示尺寸，120px 实际尺寸（用于店铺列表页面）</Text>
              </Space>
            </Card>

            {/* URL 对比 */}
            <Card title="URL 对比" size="small">
              <Space direction="vertical">
                <div>
                  <Text strong>原始URL：</Text>
                  <Text copyable code>{FILE_CONFIG.getAssetUrl(testImageId)}</Text>
                </div>
                <div>
                  <Text strong>优化后URL（THUMBNAIL）：</Text>
                  <Text copyable code>{FILE_CONFIG.getAssetUrl(testImageId, undefined, IMAGE_CONFIGS.THUMBNAIL)}</Text>
                </div>
              </Space>
            </Card>
            
          </Space>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}