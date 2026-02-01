// BoonLink Notification System
// Sends notifications via LINE (through backend API)

// Send notification to merchant
async function sendNotification(paymentData) {
    const settings = getNotificationSettings();

    if (!settings.enabled || !settings.lineUserId) {
        console.log('Notifications not configured');
        return;
    }

    try {
        const response = await fetch('/api/send-line', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: settings.lineUserId,
                amountTHB: paymentData.amountTHB,
                note: paymentData.note || '',
                orderId: paymentData.orderId,
                timestamp: new Date().toLocaleString('zh-CN')
            })
        });

        if (!response.ok) {
            throw new Error('Notification failed');
        }

        console.log('Notification sent successfully');
    } catch (error) {
        console.error('Failed to send notification:', error);
        // Don't throw - notification failure shouldn't block payment
    }
}

// Get notification settings
function getNotificationSettings() {
    const defaults = {
        enabled: false,
        lineUserId: ''
    };
    const saved = localStorage.getItem('notificationSettings');
    return saved ? JSON.parse(saved) : defaults;
}

// Set notification settings
function setNotificationSettings(settings) {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
}

// Export for use in HTML
window.sendNotification = sendNotification;
window.getNotificationSettings = getNotificationSettings;
window.setNotificationSettings = setNotificationSettings;
