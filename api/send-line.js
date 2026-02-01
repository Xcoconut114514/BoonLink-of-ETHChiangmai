// Vercel Serverless Function - Send LINE Notification
// POST /api/send-line

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, amountTHB, note, orderId, timestamp } = req.body;

    // Validate required fields
    if (!userId) {
        return res.status(400).json({
            error: 'Missing userId',
            message: '商家 ID 不能为空。请先输入 LINE User ID。'
        });
    }

    // Validate userId format (should start with U and be 33 chars)
    if (!userId.startsWith('U') || userId.length !== 33) {
        return res.status(400).json({
            error: 'Invalid userId format',
            message: 'LINE User ID 格式错误。正确格式应为 U 开头的 33 位字符（如 Ua1b2c3d...）。请在 LINE 中发送「我的ID」给官方账号获取正确的 User ID。'
        });
    }

    if (amountTHB === undefined || amountTHB === null) {
        return res.status(400).json({
            error: 'Missing amountTHB',
            message: '金额参数缺失'
        });
    }

    // Get token from environment variable (SECURE!)
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!accessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
        return res.status(500).json({
            error: 'LINE not configured',
            message: '服务器 LINE 配置错误。请联系管理员在 Vercel Dashboard 配置 LINE_CHANNEL_ACCESS_TOKEN 环境变量。'
        });
    }

    // Build message (NO CRYPTO INFO - compliance!) - English version
    let message;

    // Test message (when amountTHB = 0)
    if (amountTHB === 0 && note === '测试消息') {
        message = `🔔 BoonLink Connection Test Successful!

✅ Your Merchant ID is configured correctly
✅ LINE notification is working
✅ You will receive notifications when payments arrive

---
BoonLink - Smart Payment Assistant`;
    } else {
        // Real payment notification - English
        message = `BoonLink Payment Received ✅

💰 Amount: ฿${Number(amountTHB).toLocaleString()}
${note ? `📝 Note: ${note}\n` : ''}⏰ Time: ${timestamp || new Date().toLocaleString('en-US')}
📋 Order: ${orderId || 'N/A'}

---
BoonLink - Smart Payment Assistant`;
    }

    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                to: userId,
                messages: [{
                    type: 'text',
                    text: message
                }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('LINE API Error:', error);

            // Provide user-friendly error messages
            let userMessage = 'LINE 发送失败';
            if (error.message) {
                if (error.message.includes('Invalid user id')) {
                    userMessage = 'LINE User ID 无效。请确认您输入的 ID 是否正确。';
                } else if (error.message.includes('Invalid reply token')) {
                    userMessage = 'LINE Token 错误。请联系管理员检查配置。';
                } else {
                    userMessage = error.message;
                }
            }

            return res.status(response.status).json({
                error: error.message || 'LINE API error',
                message: userMessage,
                details: error
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('LINE notification error:', error);
        return res.status(500).json({ error: 'Failed to send notification' });
    }
}
