// Vercel Serverless Function - LINE Webhook
// POST /api/line-webhook

import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify signature
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const signature = req.headers['x-line-signature'];

    if (channelSecret && signature) {
        const body = JSON.stringify(req.body);
        const hash = crypto
            .createHmac('SHA256', channelSecret)
            .update(body)
            .digest('base64');

        if (hash !== signature) {
            console.error('Invalid signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
    }

    // Process events
    const events = req.body.events || [];
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    for (const event of events) {
        // New follower
        if (event.type === 'follow') {
            const userId = event.source.userId;
            console.log('New merchant followed:', userId);

            // Send welcome message
            await sendMessage(accessToken, userId, `欢迎使用 BoonLink 收款通知！ 🎉

您的商家 ID:
${userId}

请在 BoonLink 商家设置页面输入此 ID 来接收收款通知。

发送「我的ID」可随时查看您的商家 ID。`);
        }

        // Message received
        if (event.type === 'message' && event.message.type === 'text') {
            const userId = event.source.userId;
            const text = event.message.text;

            // If user asks for their ID
            if (text.includes('我的ID') || text.includes('我的id') || text.toLowerCase().includes('myid') || text.includes('ID')) {
                await replyMessage(accessToken, event.replyToken, `您的商家 ID:

${userId}

请复制此 ID 到 BoonLink 商家设置页面。`);
            }
        }
    }

    return res.status(200).json({ success: true });
}

// Helper: Send push message
async function sendMessage(accessToken, userId, text) {
    try {
        await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                to: userId,
                messages: [{ type: 'text', text }]
            })
        });
    } catch (error) {
        console.error('Failed to send message:', error);
    }
}

// Helper: Reply to message
async function replyMessage(accessToken, replyToken, text) {
    try {
        await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                replyToken,
                messages: [{ type: 'text', text }]
            })
        });
    } catch (error) {
        console.error('Failed to reply:', error);
    }
}
