# BoonLink LINE 通知设置指南

本指南将帮助您配置 BoonLink 的 LINE 通知功能。

## 📋 前提条件

- LINE 账号
- LINE Channel Access Token（您已有：`2009025417`）
- Vercel 账号或本地开发环境

---

## 🔧 方案 A：本地开发测试（推荐用于开发）

### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

### 2. 验证环境变量

确认项目根目录下的 `.env` 文件已创建，内容如下：

```bash
LINE_CHANNEL_ID=2009025417
LINE_CHANNEL_SECRET=d13927bbc0246b0ce43a8a67013182b9
LINE_CHANNEL_ACCESS_TOKEN=uiSg5Vd2QFzr49fghiiJol6Rk/+2/OAFcW1R5morWJP5TG2FPyPe3Nj+qX6fv+ftcdiWPW2qCn9+YYbnDmWuF7/SkA4zoDCgvrGrjB6wedXge6SDT0E/wHTBUAl9zudqtBqcYqZ4qaJIMZWnlMZo8wdB04t89/1O/w1cDnyilFU=
BSC_RPC_URL=https://bsc-dataseed.binance.org/
```

**⚠️ 重要：** `.env` 文件已在 `.gitignore` 中，不会被推送到 Git 仓库。

### 3. 启动本地开发服务器

```bash
cd C:\Users\28194\OneDrive\Desktop\chaingmai
vercel dev
```

**等待输出：**
```
> Ready! Available at http://localhost:3000
```

### 4. 访问商家设置页面

浏览器打开：
```
http://localhost:3000/receive/settings.html
```

### 5. 获取 LINE User ID

**步骤：**

1. 在 LINE 中搜索并添加您的 BoonLink 官方账号（Channel ID: `2009025417`）
2. 发送消息：`我的ID`
3. 系统会自动回复您的 User ID（格式：`Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`，33位字符）
4. 复制此 ID

**示例 User ID：**
```
Ua1b2c3d4e5f6789012345678901234
```

### 6. 配置并测试

1. 在商家设置页面，找到「LINE 通知」部分
2. 启用「启用 LINE 通知」开关
3. 将复制的 User ID 粘贴到输入框
4. 点击「测试 LINE 连接」按钮
5. 检查您的 LINE 是否收到测试消息

**成功消息：**
```
✅ LINE 连接成功！请检查您的 LINE 是否收到测试消息。
```

**如果收到错误：**

| 错误信息 | 解决方法 |
|---------|---------|
| `LINE User ID 格式错误` | 确认 User ID 是 U 开头的 33 位字符 |
| `LINE User ID 无效` | 重新在 LINE 中发送「我的ID」获取正确 ID |
| `LINE Token 错误` | 检查 `.env` 文件中的 `LINE_CHANNEL_ACCESS_TOKEN` 是否正确 |
| `网络错误 API 服务未启动` | 确认 `vercel dev` 正在运行 |

---

## 🚀 方案 B：部署到 Vercel 生产环境

### 1. 推送代码到 Git 仓库

```bash
git add .
git commit -m "feat: Add LINE notification with test button"
git push origin master
```

### 2. 部署到 Vercel

```bash
vercel --prod
```

或者在 Vercel Dashboard 中连接您的 Git 仓库自动部署。

### 3. 配置 Vercel 环境变量

**在 Vercel Dashboard 中：**

1. 进入您的项目
2. 点击 **Settings** → **Environment Variables**
3. 添加以下变量：

| Key | Value |
|-----|-------|
| `LINE_CHANNEL_ID` | `2009025417` |
| `LINE_CHANNEL_SECRET` | `d13927bbc0246b0ce43a8a67013182b9` |
| `LINE_CHANNEL_ACCESS_TOKEN` | `uiSg5Vd2QFzr49fghiiJol6Rk/+2/...（完整 token）` |
| `BSC_RPC_URL` | `https://bsc-dataseed.binance.org/` |

4. 点击 **Save**
5. **重新部署**项目以使环境变量生效

### 4. 访问生产环境

```
https://your-project.vercel.app/receive/settings.html
```

### 5. 配置并测试

按照「方案 A - 步骤 5-6」进行配置和测试。

---

## 📱 LINE User ID 格式说明

**正确格式：**
- 以 `U` 开头
- 总长度 33 位字符
- 包含字母和数字

**示例：**
```
✅ Ua1b2c3d4e5f6789012345678901234  (正确)
❌ a1b2c3d4e5f6789012345678901234   (错误：缺少 U)
❌ U12345                           (错误：长度不够)
```

---

## 🔍 调试技巧

### 查看浏览器控制台

1. 按 F12 打开开发者工具
2. 切换到 **Console** 标签
3. 点击「测试 LINE 连接」
4. 查看错误详情

### 查看 Vercel 日志

```bash
vercel logs
```

或在 Vercel Dashboard 中查看 **Deployments** → **Function Logs**。

---

## ✅ 验证清单

测试成功后，确认以下功能：

- [ ] 本地开发服务器启动正常（`vercel dev`）
- [ ] 可以访问 `http://localhost:3000/receive/settings.html`
- [ ] 已获取正确的 LINE User ID（33位，U开头）
- [ ] 点击「测试 LINE 连接」后收到成功提示
- [ ] LINE 中收到测试消息：「🔔 BoonLink 连接测试成功！」
- [ ] 三种语言切换正常（中文/English/ไทย）

---

## 🎯 下一步

配置成功后，当商家收到付款时：

1. 页面会自动播放语音（如已启用）
2. LINE 会收到收款通知（如已启用）
3. 通知格式：

```
BoonLink 收款通知 ✅

💰 金额: ฿1,234
📝 备注: 咖啡
⏰ 时间: 2026-02-01 15:30:00
📋 订单: ORD-20260201-001

---
BoonLink - 智能收款助手
```

**注意：** 商家端通知中**不会显示任何加密货币信息**（符合 Zero-Touch Crypto 合规要求）。

---

## 📞 常见问题

### Q: 为什么直接打开 HTML 文件不行？

A: `/api/send-line` 是 Vercel Serverless 函数，需要通过 `vercel dev` 或部署后才能运行。直接打开 HTML 文件会导致 API 404 错误。

### Q: 可以使用 `http-server` 或其他本地服务器吗？

A: 不行。必须使用 `vercel dev`，因为需要 Vercel 的 Serverless Functions 运行时环境。

### Q: 如何更换 LINE Channel？

A: 修改 `.env` 文件（本地）和 Vercel 环境变量（生产环境），然后重新部署。

---

**🎉 祝您使用愉快！**

如有问题，请查看：
- [LINE Messaging API 文档](https://developers.line.biz/en/docs/messaging-api/)
- [Vercel 文档](https://vercel.com/docs)
