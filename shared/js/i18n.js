// BoonLink i18n - 多语言支持
// 支持: 中文 (zh), English (en), ไทย (th)

const translations = {
    // ========== 共享 ==========
    common: {
        zh: {
            appName: 'BoonLink',
            back: '返回',
            save: '保存',
            cancel: '取消',
            confirm: '确认',
            loading: '加载中...',
            error: '错误',
            success: '成功',
            thb: '泰铢',
            note: '备注'
        },
        en: {
            appName: 'BoonLink',
            back: 'Back',
            save: 'Save',
            cancel: 'Cancel',
            confirm: 'Confirm',
            loading: 'Loading...',
            error: 'Error',
            success: 'Success',
            thb: 'Thai Baht',
            note: 'Note'
        },
        th: {
            appName: 'BoonLink',
            back: 'กลับ',
            save: 'บันทึก',
            cancel: 'ยกเลิก',
            confirm: 'ยืนยัน',
            loading: 'กำลังโหลด...',
            error: 'ข้อผิดพลาด',
            success: 'สำเร็จ',
            thb: 'บาท',
            note: 'หมายเหตุ'
        }
    },

    // ========== 用户端 ==========
    customer: {
        zh: {
            // 首页 - 钱包连接
            connectWallet: '连接钱包',
            connectWalletDesc: '使用自托管钱包进行安全支付',
            connectMetaMask: '连接 MetaMask',
            walletConnected: '钱包已连接',
            address: '地址',
            balance: '余额',
            remainingLimit: '今日剩余限额',
            disconnectWallet: '断开钱包',
            privateKeySafe: '私钥安全',
            youControl: '您自己保管',
            offlinePayment: '离线支付',
            supported: '支持',
            network: '网络',
            lowGas: '低 Gas',
            nonCustodial: 'Non-custodial · 私钥不离手',

            // 扫码
            scanQR: '扫描二维码',
            scanPromptPay: '扫码支付 PromptPay',
            pointCamera: '将摄像头对准 PromptPay 二维码',

            // 金额
            enterAmount: '输入金额',
            amount: '金额',
            addNote: '添加备注',
            noteOptional: '备注（选填）',
            quickTags: '快捷标签',
            continuePayment: '继续支付',

            // 选择代币
            selectToken: '选择支付方式',
            paymentAmount: '支付金额',
            gasFee: 'Gas 费用',
            exchangeRate: '汇率',
            confirmPayment: '确认支付',

            // 成功
            paymentSuccess: '支付成功',
            transactionDetails: '交易详情',
            txHash: '交易哈希',
            viewOnExplorer: '在区块浏览器查看',
            newPayment: '新的支付',

            // 设置
            settings: '设置',
            paymentLimits: '支付限额',
            singleLimit: '单笔限额',
            dailyLimit: '每日限额',
            todaySpent: '今日已支付',
            remaining: '剩余',
            maxAllowed: '最高',
            saveSettings: '保存设置'
        },
        en: {
            connectWallet: 'Connect Wallet',
            connectWalletDesc: 'Use self-custody wallet for secure payment',
            connectMetaMask: 'Connect MetaMask',
            walletConnected: 'Wallet Connected',
            address: 'Address',
            balance: 'Balance',
            remainingLimit: 'Remaining Daily Limit',
            disconnectWallet: 'Disconnect',
            privateKeySafe: 'Private Key',
            youControl: 'You control',
            offlinePayment: 'Offline Payment',
            supported: 'Supported',
            network: 'Network',
            lowGas: 'Low Gas',
            nonCustodial: 'Non-custodial · Your keys, your crypto',

            scanQR: 'Scan QR Code',
            scanPromptPay: 'Scan PromptPay',
            pointCamera: 'Point camera at PromptPay QR code',

            enterAmount: 'Enter Amount',
            amount: 'Amount',
            addNote: 'Add Note',
            noteOptional: 'Note (optional)',
            quickTags: 'Quick Tags',
            continuePayment: 'Continue',

            selectToken: 'Select Payment',
            paymentAmount: 'Payment Amount',
            gasFee: 'Gas Fee',
            exchangeRate: 'Exchange Rate',
            confirmPayment: 'Confirm Payment',

            paymentSuccess: 'Payment Successful',
            transactionDetails: 'Transaction Details',
            txHash: 'Transaction Hash',
            viewOnExplorer: 'View on Explorer',
            newPayment: 'New Payment',

            settings: 'Settings',
            paymentLimits: 'Payment Limits',
            singleLimit: 'Per Transaction',
            dailyLimit: 'Daily Limit',
            todaySpent: 'Spent Today',
            remaining: 'Remaining',
            maxAllowed: 'Max',
            saveSettings: 'Save Settings'
        },
        th: {
            connectWallet: 'เชื่อมต่อกระเป๋า',
            connectWalletDesc: 'ใช้กระเป๋าส่วนตัวเพื่อชำระเงินอย่างปลอดภัย',
            connectMetaMask: 'เชื่อมต่อ MetaMask',
            walletConnected: 'เชื่อมต่อแล้ว',
            address: 'ที่อยู่',
            balance: 'ยอดคงเหลือ',
            remainingLimit: 'วงเงินคงเหลือวันนี้',
            disconnectWallet: 'ยกเลิกการเชื่อมต่อ',
            privateKeySafe: 'คีย์ส่วนตัว',
            youControl: 'คุณควบคุมเอง',
            offlinePayment: 'ชำระออฟไลน์',
            supported: 'รองรับ',
            network: 'เครือข่าย',
            lowGas: 'ค่า Gas ต่ำ',
            nonCustodial: 'Non-custodial · คีย์ของคุณ คริปโตของคุณ',

            scanQR: 'สแกน QR Code',
            scanPromptPay: 'สแกน PromptPay',
            pointCamera: 'เล็งกล้องไปที่ QR Code PromptPay',

            enterAmount: 'ใส่จำนวนเงิน',
            amount: 'จำนวนเงิน',
            addNote: 'เพิ่มหมายเหตุ',
            noteOptional: 'หมายเหตุ (ไม่บังคับ)',
            quickTags: 'แท็กด่วน',
            continuePayment: 'ดำเนินการต่อ',

            selectToken: 'เลือกวิธีชำระเงิน',
            paymentAmount: 'จำนวนเงินที่ชำระ',
            gasFee: 'ค่า Gas',
            exchangeRate: 'อัตราแลกเปลี่ยน',
            confirmPayment: 'ยืนยันการชำระเงิน',

            paymentSuccess: 'ชำระเงินสำเร็จ',
            transactionDetails: 'รายละเอียดธุรกรรม',
            txHash: 'แฮชธุรกรรม',
            viewOnExplorer: 'ดูใน Explorer',
            newPayment: 'การชำระเงินใหม่',

            settings: 'ตั้งค่า',
            paymentLimits: 'วงเงินการชำระ',
            singleLimit: 'ต่อรายการ',
            dailyLimit: 'วงเงินรายวัน',
            todaySpent: 'ใช้ไปวันนี้',
            remaining: 'คงเหลือ',
            maxAllowed: 'สูงสุด',
            saveSettings: 'บันทึกการตั้งค่า'
        }
    },

    // ========== 商家端 ==========
    merchant: {
        zh: {
            // 首页
            merchantHome: '商家收款',
            scanToReceive: '扫码收款',
            receiveHistory: '收款记录',
            notificationSettings: '通知设置',

            // 收款
            scanPaymentCode: '扫码收款',
            letCustomerShowQR: '请让顾客出示付款码',

            // 收款成功 (注意: 不包含任何加密货币术语!)
            paymentReceived: '收款成功',
            amountReceived: '金额',
            time: '时间',
            orderId: '订单号',
            continueReceiving: '继续收款',

            // 重复警告
            duplicateWarning: '检测到重复付款码',
            alreadyScanned: '此付款码已被扫描过',
            askNewQR: '请让顾客重新生成付款码',
            understood: '我知道了',

            // 设置
            voiceSettings: '语音播报',
            autoPlay: '自动播报',
            autoPlayDesc: '收款成功后自动播放语音',
            voiceLanguage: '播报语言',
            testVoice: '测试语音',

            lineNotification: 'LINE 通知',
            enableLine: '启用 LINE 通知',
            enableLineDesc: '收款成功后发送 LINE 消息',
            testLineConnection: '测试 LINE 连接',
            merchantId: '商家 ID',
            enterMerchantId: '输入您的商家 ID',
            howToGetId: '如何获取商家 ID：',
            step1: '1. 在 LINE 搜索并添加 BoonLink 官方账号',
            step2: '2. 发送「我的ID」到官方账号',
            step3: '3. 复制返回的 ID 粘贴到上方输入框',

            settingsSaved: '设置已保存'
        },
        en: {
            merchantHome: 'Merchant',
            scanToReceive: 'Scan to Receive',
            receiveHistory: 'History',
            notificationSettings: 'Notifications',

            scanPaymentCode: 'Scan Payment',
            letCustomerShowQR: 'Ask customer to show payment code',

            paymentReceived: 'Payment Received',
            amountReceived: 'Amount',
            time: 'Time',
            orderId: 'Order ID',
            continueReceiving: 'Continue',

            duplicateWarning: 'Duplicate Payment Code',
            alreadyScanned: 'This payment code was already scanned',
            askNewQR: 'Ask customer to generate a new code',
            understood: 'Got it',

            voiceSettings: 'Voice Announcement',
            autoPlay: 'Auto Play',
            autoPlayDesc: 'Play voice when payment received',
            voiceLanguage: 'Language',
            testVoice: 'Test Voice',

            lineNotification: 'LINE Notification',
            enableLine: 'Enable LINE',
            enableLineDesc: 'Send LINE message on payment',
            testLineConnection: 'Test LINE Connection',
            merchantId: 'Merchant ID',
            enterMerchantId: 'Enter your merchant ID',
            howToGetId: 'How to get your ID:',
            step1: '1. Search and add BoonLink on LINE',
            step2: '2. Send "My ID" to the official account',
            step3: '3. Copy the returned ID here',

            settingsSaved: 'Settings saved'
        },
        th: {
            merchantHome: 'ร้านค้า',
            scanToReceive: 'สแกนรับเงิน',
            receiveHistory: 'ประวัติ',
            notificationSettings: 'การแจ้งเตือน',

            scanPaymentCode: 'สแกนรับชำระ',
            letCustomerShowQR: 'ให้ลูกค้าแสดง QR ชำระเงิน',

            paymentReceived: 'ได้รับเงินแล้ว',
            amountReceived: 'จำนวนเงิน',
            time: 'เวลา',
            orderId: 'หมายเลขคำสั่งซื้อ',
            continueReceiving: 'ดำเนินการต่อ',

            duplicateWarning: 'พบ QR ซ้ำ',
            alreadyScanned: 'QR นี้ถูกสแกนไปแล้ว',
            askNewQR: 'กรุณาให้ลูกค้าสร้าง QR ใหม่',
            understood: 'เข้าใจแล้ว',

            voiceSettings: 'เสียงแจ้งเตือน',
            autoPlay: 'เล่นอัตโนมัติ',
            autoPlayDesc: 'เล่นเสียงเมื่อได้รับเงิน',
            voiceLanguage: 'ภาษา',
            testVoice: 'ทดสอบเสียง',

            lineNotification: 'แจ้งเตือน LINE',
            enableLine: 'เปิดใช้ LINE',
            enableLineDesc: 'ส่งข้อความ LINE เมื่อได้รับเงิน',
            testLineConnection: 'ทดสอบการเชื่อมต่อ LINE',
            merchantId: 'รหัสร้านค้า',
            enterMerchantId: 'ใส่รหัสร้านค้าของคุณ',
            howToGetId: 'วิธีรับรหัส:',
            step1: '1. ค้นหาและเพิ่ม BoonLink บน LINE',
            step2: '2. ส่ง "My ID" ไปยังบัญชีทางการ',
            step3: '3. คัดลอก ID ที่ได้รับมาใส่ที่นี่',

            settingsSaved: 'บันทึกการตั้งค่าแล้ว'
        }
    }
};

// 当前语言
let currentLang = localStorage.getItem('boonlink_lang') || 'zh';

// 获取翻译
function t(section, key) {
    const lang = currentLang;
    if (translations[section] && translations[section][lang] && translations[section][lang][key]) {
        return translations[section][lang][key];
    }
    // Fallback to Chinese
    if (translations[section] && translations[section]['zh'] && translations[section]['zh'][key]) {
        return translations[section]['zh'][key];
    }
    return key;
}

// 快捷方法
function tc(key) { return t('common', key); }
function tcu(key) { return t('customer', key); }
function tm(key) { return t('merchant', key); }

// 切换语言
function setLanguage(lang) {
    if (!['zh', 'en', 'th'].includes(lang)) return;

    currentLang = lang;
    localStorage.setItem('boonlink_lang', lang);

    // 更新所有带 data-i18n 的元素
    updatePageTranslations();

    // 更新语言按钮状态
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        }
    });

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

// 更新页面翻译
function updatePageTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const section = el.dataset.i18nSection || 'common';
        el.textContent = t(section, key);
    });

    // 更新 placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        const section = el.dataset.i18nSection || 'common';
        el.placeholder = t(section, key);
    });
}

// 获取当前语言
function getCurrentLanguage() {
    return currentLang;
}

// 语言切换器 HTML
function getLanguageSwitcherHTML() {
    return `
    <div class="language-switcher">
        <button class="lang-btn ${currentLang === 'zh' ? 'active' : ''}" data-lang="zh" onclick="setLanguage('zh')">中文</button>
        <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en" onclick="setLanguage('en')">EN</button>
        <button class="lang-btn ${currentLang === 'th' ? 'active' : ''}" data-lang="th" onclick="setLanguage('th')">ไทย</button>
    </div>
    `;
}

// 初始化
function initI18n() {
    updatePageTranslations();
}

// 导出
window.BoonLinkI18n = {
    t,
    tc,
    tcu,
    tm,
    setLanguage,
    getCurrentLanguage,
    getLanguageSwitcherHTML,
    initI18n,
    translations
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initI18n);
