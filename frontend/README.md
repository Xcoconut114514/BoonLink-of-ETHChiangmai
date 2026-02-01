# BoonLink Frontend - WeChat Pay Style UI

完全还原微信支付 PromptPay 界面风格的 BoonLink 加密货币支付演示前端。

## 特性

- ✅ **完全还原微信支付风格** - 深色主题、数字键盘、流畅动画
- ✅ **支持三种加密货币** - USDT、USDC、ETH
- ✅ **中英泰三语切换** - 商家凭证页面支持多语言
- ✅ **移动端优先设计** - 完美适配手机屏幕
- ✅ **零依赖** - 纯 HTML/CSS/JS，无需构建
- ✅ **即时预览** - 双击即可在浏览器中查看

## 页面结构

```
frontend/
├── index.html              # 首页（演示入口）
├── amount.html             # 输入金额页（数字键盘）
├── select-token.html       # 选择代币页
├── success.html            # 支付成功页
├── merchant.html           # 商家凭证页（三语）
├── css/
│   └── style.css           # 全局样式（微信深色主题）
└── js/
    └── (未使用，逻辑已内嵌)
```

## 快速预览

### 方法 1: 直接打开（最简单）

```bash
# Windows
双击 frontend/index.html

# macOS/Linux
open frontend/index.html
```

### 方法 2: VS Code Live Server

1. 安装 VS Code 扩展 "Live Server"
2. 右键 `index.html` → "Open with Live Server"
3. 浏览器自动打开 `http://localhost:5500`

### 方法 3: Python 简单服务器

```bash
cd frontend
python -m http.server 3000
# 访问 http://localhost:3000
```

### 方法 4: Node.js 服务器

```bash
cd frontend
npx serve
# 访问提示的地址
```

## 手机预览

1. 确保手机和电脑在同一 WiFi
2. 启动本地服务器（方法 2/3/4）
3. 查看电脑 IP 地址：
   ```bash
   # Windows
   ipconfig

   # macOS/Linux
   ifconfig
   ```
4. 手机浏览器访问: `http://[你的IP]:3000`

## 演示流程

| 步骤 | 页面 | 操作 |
|------|------|------|
| 1 | **首页** | 点击「开始扫码支付」 |
| 2 | **输入金额** | 使用数字键盘输入泰铢金额（默认 40） |
| 3 | **选择代币** | 选择 USDT/USDC/ETH，查看换算 |
| 4 | **支付成功** | 查看汇率优惠、交易哈希 |
| 5 | **商家凭证** | 切换语言（中/英/泰），查看收款详情 |

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| HTML5 | - | 页面结构 |
| CSS3 | - | 微信深色主题样式 |
| JavaScript (ES6+) | - | 交互逻辑 |
| CSS Variables | - | 主题颜色管理 |
| LocalStorage | - | 跨页面数据传递 |

## 核心功能

### 1. 数字键盘（amount.html）

```javascript
// 核心功能
- 数字输入 (0-9)
- 小数点支持
- 删除键（退格）
- 实时金额显示
- 键盘快捷键支持
```

### 2. 代币选择（select-token.html）

```javascript
// 汇率计算
USDT: 1 USDT = ฿35.40
USDC: 1 USDC = ฿35.40
ETH:  1 ETH  = ฿120,000

// 自动换算显示
amountCrypto = amountTHB / rate
```

### 3. 多语言切换（merchant.html）

```javascript
// 支持语言
- 中文（zh）
- English（en）
- ไทย（th）

// 切换方式
点击顶部语言按钮即时切换
```

## 样式规范

### 核心颜色

```css
--bg-primary: #000000;      /* 纯黑背景 */
--accent-green: #07C160;    /* 微信绿 */
--accent-orange: #FF9500;   /* 优惠橙色 */
--text-primary: #ffffff;    /* 主文字 */
--text-secondary: #8e8e93;  /* 次要文字 */
```

### 关键组件

- **数字键盘**: 3x4 网格，右侧绿色付款按钮跨 3 行
- **金额显示**: 56px 超大字体，轻字重
- **卡片**: 12px 圆角，深色背景
- **按钮**: 圆角 8px，绿色主按钮

## 部署到 Vercel（可选）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 部署
cd frontend
vercel

# 3. 按提示完成部署
# 获得 HTTPS URL
```

## 集成到 Telegram Mini App

1. **创建 Bot**
   ```
   在 Telegram 找 @BotFather
   /newbot → 设置名称和用户名
   ```

2. **配置 Web App**
   ```
   /mybots → 选择你的 Bot
   Bot Settings → Menu Button
   设置 URL: https://your-vercel-url.app
   ```

3. **测试**
   ```
   打开你的 Bot
   点击左下角菜单按钮
   Mini App 在 Telegram 内打开
   ```

## 演示数据

```javascript
// 默认值
merchantName: "TUNGNGERN（）"
amountTHB: 40
selectedToken: "USDT"

// 汇率
market: 35.50 THB/USDT
discount: 35.40 THB/USDT

// 余额（Mock）
USDT: 100.00
USDC: 50.00
ETH: 0.5
```

## 自定义

### 修改默认金额

编辑 `amount.html`:
```javascript
let currentAmount = '100';  // 改为你想要的默认值
```

### 修改汇率

编辑 `select-token.html`:
```javascript
const rates = {
  USDT: 35.40,  // 修改汇率
  USDC: 35.40,
  ETH: 120000,
};
```

### 修改主题颜色

编辑 `css/style.css`:
```css
:root {
  --accent-green: #07C160;  /* 改为你的品牌色 */
}
```

## 浏览器兼容性

| 浏览器 | 版本 | 支持 |
|--------|------|------|
| Chrome | 90+ | ✅ |
| Safari | 14+ | ✅ |
| Firefox | 88+ | ✅ |
| Edge | 90+ | ✅ |
| Mobile Safari | iOS 14+ | ✅ |
| Chrome Mobile | Android 10+ | ✅ |

## 性能优化

- ✅ 无外部依赖，加载速度极快
- ✅ CSS 变量统一管理主题
- ✅ LocalStorage 轻量级数据传递
- ✅ 触觉反馈（振动）增强交互
- ✅ 响应式设计，适配所有屏幕

## 已知限制

1. **纯演示前端** - 不包含真实的区块链交互
2. **Mock 数据** - 交易哈希、时间戳为模拟生成
3. **语音播报** - 需要浏览器支持 Speech Synthesis API
4. **离线功能** - 需要 Service Worker（未实现）

## 下一步

### 与后端集成

参考 `../extensions/boonlink-pay/` 目录下的 TypeScript 后端代码：

```javascript
// 替换 Mock 数据
// 1. 连接钱包（WalletConnect）
// 2. 调用后端 API 获取真实汇率
// 3. 签名并广播交易
// 4. 等待链上确认
// 5. 触发 PromptPay 结算
```

### 添加真实功能

- [ ] 集成 WalletConnect
- [ ] 连接 BSC RPC 节点
- [ ] 实现二维码扫描（jsqr）
- [ ] 添加 Service Worker（离线支持）
- [ ] 集成 Telegram Web App SDK

## 截图

| 页面 | 描述 |
|------|------|
| 首页 | 演示入口，功能介绍 |
| 输入金额 | 数字键盘，实时换算 |
| 选择代币 | USDT/USDC/ETH 切换 |
| 支付成功 | 汇率优惠展示 |
| 商家凭证 | 三语切换，收款确认 |

## 联系方式

- GitHub: [openclaw/openclaw](https://github.com/openclaw/openclaw)
- Hackathon: Chiang Mai Local Payment Challenge 2025

## License

MIT License - 本项目仅用于黑客松演示

---

**Made with ❤️ for Chiang Mai Hackathon 2025**
