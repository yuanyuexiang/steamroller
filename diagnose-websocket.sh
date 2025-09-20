#!/bin/bash

# Directus WebSocket诊断脚本

echo "=== Directus WebSocket 连接诊断 ==="
echo

# 检查服务器基本连接
echo "1. 检查服务器HTTP连接..."
curl -I https://forge.matrix-net.tech/server/ping 2>/dev/null || echo "HTTP连接失败"

echo
echo "2. 检查GraphQL端点..."
curl -I https://forge.matrix-net.tech/graphql 2>/dev/null || echo "GraphQL端点无响应"

echo
echo "3. 尝试WebSocket连接测试..."
echo "使用wscat测试（如果安装了）:"
echo "wscat -c wss://forge.matrix-net.tech/graphql"

echo
echo "4. 检查防火墙和代理设置..."
echo "本地环境变量:"
env | grep -i proxy || echo "未检测到代理设置"

echo
echo "5. 网络诊断..."
ping -c 3 forge.matrix-net.tech

echo
echo "=== 建议检查项目 ==="
echo "□ Directus服务器是否启用WEBSOCKETS_ENABLED=true"
echo "□ 服务器是否支持WebSocket协议升级"
echo "□ 防火墙是否开放了WebSocket端口"
echo "□ 代理服务器是否支持WebSocket"
echo "□ SSL证书是否支持WebSocket连接"