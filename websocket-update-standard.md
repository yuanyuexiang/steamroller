# WebSocket 配置更新 - Directus 标准端点

## 更新说明

根据您的要求，已将 WebSocket 配置更新为遵循 Directus 标准，统一使用 `/graphql` 端点进行 WebSocket 连接。

## 主要变更

### 1. 配置 API 简化
**文件**: `src/app/api/websocket/route.ts`

**之前**: 支持多端点 (`/websocket` 和 `/graphql`)
**现在**: 单一标准端点 (`/graphql`)

```json
{
  "wsUrl": "wss://steamroller.kcbaotech.com/graphql",
  "endpoint": "/graphql", 
  "authMode": "handshake",
  "directusUrl": "https://steamroller.kcbaotech.com",
  "success": true,
  "note": "Directus标准WebSocket端点，使用/graphql进行WebSocket连接"
}
```

### 2. 通知系统简化
**文件**: `src/hooks/useNotifications.ts`

- 移除了多端点检测和降级逻辑
- 统一使用 `/graphql` 端点
- 简化了连接流程，提高了可靠性

### 3. 测试工具更新
**文件**: `test-websocket-complete.html`

- 默认 URL 更改为 `ws://localhost:8055/graphql`
- 移除了多端点测试功能
- 专注于测试标准 Directus GraphQL WebSocket 端点

## Traefik 配置建议

现在您只需要在 Traefik 配置中支持 `/graphql` 端点即可：

```yaml
# docker-compose.yaml 中的 Traefik 标签
traefik.http.routers.directus.rule: Host(`steamroller.kcbaotech.com`) && (PathPrefix(`/graphql`) || PathPrefix(`/`))
```

## 验证步骤

### 1. 检查配置 API
```bash
curl -s http://localhost:3000/api/websocket | jq
```

预期输出：
```json
{
  "wsUrl": "wss://steamroller.kcbaotech.com/graphql",
  "endpoint": "/graphql",
  "authMode": "handshake",
  "directusUrl": "https://steamroller.kcbaotech.com",
  "success": true
}
```

### 2. 测试 WebSocket 连接
```bash
# 打开测试页面
open test-websocket-complete.html
```

### 3. 检查 Directus GraphQL 端点
```bash
curl -I https://steamroller.kcbaotech.com/graphql
```

应该返回 HTTP 200 或 405 (Method Not Allowed)，表示端点存在。

## 关键优势

### 1. 标准化
- 完全遵循 Directus 官方文档
- 与 Directus 生态系统完全兼容
- 减少了配置复杂性

### 2. 简化维护
- 单一端点配置
- 减少了错误处理分支
- 更清晰的代码逻辑

### 3. 更好的兼容性
- 与所有 Directus 版本兼容
- 标准的 WebSocket 升级协议
- 遵循 GraphQL over WebSocket 规范

## 实际部署

当您更新 Traefik 配置后，WebSocket 连接将：

1. 连接到 `wss://steamroller.kcbaotech.com/graphql`
2. 使用标准的 Directus WebSocket 认证流程
3. 订阅您指定的 Directus 集合变化
4. 实时接收数据变更通知

## 测试清单

- [x] ✅ 配置 API 返回正确的端点
- [x] ✅ 构建无错误
- [x] ✅ TypeScript 类型检查通过
- [ ] 🔄 WebSocket 连接测试 (需要部署后验证)
- [ ] 🔄 实时通知功能测试 (需要部署后验证)

## 下一步

1. **更新 Traefik 配置**: 移除 `/websocket` 路由，确保 `/graphql` 路由正常工作
2. **重新部署**: 部署更新后的应用
3. **功能验证**: 使用测试工具验证 WebSocket 连接和实时通知

---

现在您的 WebSocket 实时通知系统完全符合 Directus 标准，配置更加简洁和可维护！