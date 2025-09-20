# WebSocket 实时通知系统使用指南

## 系统概述

已成功实现了基于 Directus 的 WebSocket 实时通知系统，支持多端点检测和智能降级功能。

## 核心功能

### 1. 多端点支持
- **主要端点**: `/websocket` (基于您的 Traefik 配置)
- **备用端点**: `/graphql` (Directus 官方标准)
- **智能切换**: 主要端点失败时自动切换到备用端点

### 2. 实时通知
- 监听所有 Directus 集合的数据变化
- 支持 `create`、`update`、`delete` 事件
- 自动生成通知消息并显示给用户

### 3. 连接管理
- 自动重连机制（最多3次）
- 连接状态实时监控
- 手动连接/断开功能

## 技术实现

### WebSocket Hook (`src/hooks/useNotifications.ts`)
```typescript
// 使用方法
const {
  notifications,
  unreadCount,
  connected,
  loading,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  refresh,
  connect,
  disconnect
} = useNotifications();
```

### 智能通知 Hook (`src/hooks/useSmartNotifications.ts`)
```typescript
// 带有降级功能的通知系统
const {
  // 所有 useNotifications 的功能
  ...notificationFeatures,
  // 额外功能
  mode,           // 'websocket' | 'polling' | 'disabled'
  switchToMode,   // 手动切换模式
  pollingEnabled  // 轮询状态
} = useSmartNotifications();
```

### 通知下拉组件 (`src/components/notifications/NotificationDropdown.tsx`)
- 完整的UI组件，包含连接状态指示器
- 通知列表管理
- 手动模式切换按钮

## 配置说明

### 环境变量
确保您的环境变量正确配置：
```bash
DIRECTUS_URL=https://forge.matrix-net.tech
DIRECTUS_TOKEN=your_admin_token
```

### Directus 配置
您的 Docker 配置已经正确设置了 WebSocket 支持：
```yaml
environment:
  WEBSOCKETS_ENABLED: 'true'
```

### Traefik 路由
您的 Traefik 配置已经包含了 WebSocket 路由：
```yaml
traefik.http.routers.directus.rule: Host(`forge.matrix-net.tech`) && (PathPrefix(`/websocket`) || PathPrefix(`/graphql`) || PathPrefix(`/`))
```

## 使用步骤

### 1. 在页面中集成
```tsx
// 在您的页面组件中
import { NotificationDropdown } from '@components/notifications/NotificationDropdown';

export default function YourPage() {
  return (
    <div>
      {/* 其他内容 */}
      <NotificationDropdown />
    </div>
  );
}
```

### 2. 测试连接
使用提供的测试工具：
```bash
# 打开测试页面
open test-websocket-complete.html
```

### 3. 监控日志
在浏览器控制台查看 WebSocket 连接状态：
```javascript
// WebSocket: 开始连接流程
// WebSocket: 尝试连接到Directus WebSocket端点: wss://forge.matrix-net.tech/websocket
// WebSocket: 连接已建立
// WebSocket: 订阅集合变化: users
```

## 故障排除

### 连接问题
1. **检查端点可用性**:
   ```bash
   curl -I https://forge.matrix-net.tech/websocket
   curl -I https://forge.matrix-net.tech/graphql
   ```

2. **验证认证**:
   确保浏览器中存储了有效的访问令牌

3. **查看网络状态**:
   使用浏览器开发者工具的网络面板检查 WebSocket 连接

### 常见错误
- **404 Not Found**: 端点不可用，系统会自动切换到备用端点
- **401 Unauthorized**: 认证令牌无效或过期
- **Connection refused**: 服务器不可达或 WebSocket 未启用

### 降级机制
如果 WebSocket 连接失败，系统会：
1. 尝试备用 WebSocket 端点
2. 切换到 HTTP 轮询模式
3. 用户可以手动切换模式

## API 端点

### WebSocket 配置 API
```bash
GET /api/websocket
```

响应示例：
```json
{
  "primary": "wss://forge.matrix-net.tech/websocket",
  "fallback": "wss://forge.matrix-net.tech/graphql",
  "possibleEndpoints": [
    "wss://forge.matrix-net.tech/websocket",
    "wss://forge.matrix-net.tech/graphql"
  ],
  "authMode": "handshake",
  "directusUrl": "https://forge.matrix-net.tech",
  "success": true
}
```

## 测试工具

### 1. 完整测试页面
- 文件: `test-websocket-complete.html`
- 功能: 端点测试、连接测试、消息监控

### 2. 在线测试
访问您的应用并检查浏览器控制台的 WebSocket 日志

## 性能优化

### 连接池管理
- 每个用户会话只维护一个 WebSocket 连接
- 自动清理断开的连接

### 消息处理
- 限制通知历史记录为最新100条
- 智能去重避免重复通知

### 错误处理
- 优雅的错误恢复机制
- 详细的错误日志记录

## 安全考虑

### 认证
- 使用 Directus 官方认证流程
- 令牌自动刷新机制
- 安全的令牌存储

### 数据过滤
- 只监听允许的集合
- 基于用户权限的数据过滤（由 Directus 处理）

## 未来扩展

### 可能的增强功能
1. 自定义通知过滤器
2. 通知分类和优先级
3. 离线消息缓存
4. 推送通知集成
5. 通知设置面板

### 监控和分析
1. 连接质量监控
2. 消息延迟统计
3. 用户活动分析

---

## 总结

WebSocket 实时通知系统已经完全集成到您的管理系统中，具有：
- ✅ 多端点支持和智能降级
- ✅ 完整的错误处理和重连机制
- ✅ 用户友好的界面和状态指示
- ✅ 详细的日志记录和调试工具
- ✅ 高性能和安全的实现

系统已经过全面测试，构建成功，可以部署到生产环境使用。