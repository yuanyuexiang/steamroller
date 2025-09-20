import { NextRequest } from 'next/server';
import { APP_CONFIG } from '@config/app-config';

// 获取WebSocket配置信息
export async function GET() {
  try {
    // 从环境变量获取Directus配置，保持与其他API一致
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || APP_CONFIG.API.DIRECTUS.DEFAULT_URL;
    
    // 将HTTP/HTTPS URL转换为WS/WSS URL
    const wsBaseUrl = directusUrl.replace(/^http/, 'ws');
    
    // Directus标准WebSocket端点
    const websocketUrl = wsBaseUrl + '/graphql';
    
    return new Response(JSON.stringify({
      wsUrl: websocketUrl,
      endpoint: '/graphql',
      authMode: 'handshake',
      directusUrl,
      success: true,
      note: 'Directus标准WebSocket端点，使用/graphql进行WebSocket连接'
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('获取WebSocket配置失败:', error);
    return new Response(JSON.stringify({
      error: '获取WebSocket配置失败',
      success: false
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}