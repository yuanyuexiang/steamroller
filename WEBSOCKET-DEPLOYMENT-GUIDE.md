# WebSocket实时通知云部署指南

## 🚨 问题总结

你在本地开发环境收不到WebSocket实时通知的主要原因：

### 1. **Directus服务器配置问题**
你的Directus实例可能缺少以下环境变量：

```env
# Directus WebSocket配置
WEBSOCKETS_ENABLED=true
WEBSOCKETS_HEARTBEAT_ENABLED=true
WEBSOCKETS_HEARTBEAT_PERIOD=30000
WEBSOCKETS_REST_AUTH=handshake
WEBSOCKETS_GRAPHQL_AUTH=handshake

# 如果使用代理服务器
WEBSOCKETS_PATH=/websocket
```

### 2. **网络连接限制**
- 本地防火墙可能阻断WebSocket连接
- ISP可能限制WebSocket流量  
- 代理服务器不支持协议升级
- SSL证书配置问题

## 🛠 解决方案

### 方案1：智能降级系统 ✅ **已实现**

我们已经实现了智能通知系统：
- **优先WebSocket**：尝试建立WebSocket连接
- **自动降级**：10秒内连接失败自动切换到HTTP轮询
- **用户控制**：可手动切换连接模式
- **状态显示**：实时显示连接状态和模式

现在你的应用会：
1. 启动时尝试WebSocket连接
2. 如果失败，自动切换到15秒间隔的HTTP轮询
3. 在通知中心显示连接状态
4. 支持手动切换连接模式

### 方案2：云部署推荐 🚀

#### **Vercel部署**（推荐）
```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 部署
vercel

# 3. 设置环境变量
vercel env add NEXT_PUBLIC_DIRECTUS_URL production
```

#### **Netlify部署**
```bash
# 1. 构建
npm run build

# 2. 部署到Netlify
# 上传 .next/static 文件夹到CDN
```

#### **Docker部署**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 方案3：Directus服务器配置

如果你有Directus服务器的控制权限：

```bash
# 检查Directus配置
curl -X GET "https://forge.kcbaotech.com/server/specs/oas" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 启用WebSocket
# 在Directus环境变量中添加：
WEBSOCKETS_ENABLED=true
WEBSOCKETS_HEARTBEAT_ENABLED=true
WEBSOCKETS_REST_AUTH=handshake
```

## 🧪 测试步骤

### 1. **本地测试智能降级**
```bash
# 启动应用
npm run dev

# 打开浏览器控制台，观察日志：
# - "WebSocket: 开始建立连接..."
# - 如果失败: "WebSocket连接失败，切换到轮询模式"  
# - 如果成功: "WebSocket: 认证成功"
```

### 2. **使用测试工具**
```bash
# 打开WebSocket测试工具
open test-websocket-fixed.html

# 输入你的访问令牌
# 点击"测试连接"观察结果
```

### 3. **验证轮询模式**
在通知中心你会看到：
- 🔴 红色断开图标 = 轮询模式
- 🟢 绿色WiFi图标 = WebSocket已连接
- 🟡 旋转图标 = WebSocket连接中

## 📊 性能对比

| 连接方式 | 实时性 | 资源消耗 | 可靠性 | 适用场景 |
|----------|--------|----------|--------|----------|
| WebSocket | 毫秒级 | 低 | 高 | 生产环境 |
| HTTP轮询 | 15秒延迟 | 中等 | 中等 | 开发/备用 |

## 🎯 推荐部署流程

1. **立即可用**：使用当前的智能降级系统，确保功能可用
2. **短期优化**：部署到云端（Vercel/Netlify）改善连接稳定性
3. **长期方案**：配置Directus服务器的WebSocket支持

## 📝 环境变量配置

```env
# .env.local
NEXT_PUBLIC_DIRECTUS_URL=https://forge.kcbaotech.com

# 生产环境额外配置
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key
```

现在你可以：
1. **立即使用**轮询模式获取实时更新（15秒延迟）
2. **部署到云端**获得更好的WebSocket连接
3. **配置Directus**启用完整的WebSocket支持