'use client';

import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

export default function TestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <Title level={1}>测试页面</Title>
      <p>这个页面不使用任何 WebSocket 功能，用于测试基础编译是否正常。</p>
      <p>当前时间: {new Date().toLocaleString()}</p>
    </div>
  );
}