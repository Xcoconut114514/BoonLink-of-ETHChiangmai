// Vercel Serverless Function - Send LINE Notification
// POST /api/send-line

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, amountTHB, note, orderId, timestamp } = req.body;

    if (!userId || !amountTHB) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get token from environment variable (SECURE!)
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!accessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
        return res.status(500).json({ error: 'LINE not configured' });
    }

    // Build message (NO CRYPTO INFO - compliance!)
    const message = `BoonLink 收款通知 ✅

💰 金额: ฿${Number(amountTHB).toLocaleString()}
${note ? `📝 备注: ${note}\n` : ''}⏰ 时间: ${timestamp || new Date().toLocaleString('zh-CN')}
📋 订单: ${orderId || 'N/A'}

---
BoonLink - 智能收款助手`;

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
            return res.status(response.status).json(error);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('LINE notification error:', error);
        return res.status(500).json({ error: 'Failed to send notification' });
    }
}
