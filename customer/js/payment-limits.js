// BoonLink Payment Limits System
// AML Compliance + User Protection

const SYSTEM_LIMITS = {
    SINGLE_MAX: 5000,    // System max: ฿5,000 per transaction
    DAILY_MAX: 20000     // System max: ฿20,000 per day
};

// Get user-defined limits
function getUserLimits() {
    const defaults = {
        singleMax: 2000,   // Default: ฿2,000 per transaction
        dailyMax: 10000    // Default: ฿10,000 per day
    };
    const saved = localStorage.getItem('userPaymentLimits');
    return saved ? JSON.parse(saved) : defaults;
}

// Set user-defined limits (cannot exceed system limits)
function setUserLimits(singleMax, dailyMax) {
    const limits = {
        singleMax: Math.min(Math.max(0, singleMax), SYSTEM_LIMITS.SINGLE_MAX),
        dailyMax: Math.min(Math.max(0, dailyMax), SYSTEM_LIMITS.DAILY_MAX)
    };
    localStorage.setItem('userPaymentLimits', JSON.stringify(limits));
    return limits;
}

// Get today's spending
function getDailySpent() {
    const today = new Date().toDateString();
    const data = JSON.parse(localStorage.getItem('dailySpending') || '{}');
    return data[today] || 0;
}

// Add to daily spending
function addDailySpent(amount) {
    const today = new Date().toDateString();
    const data = JSON.parse(localStorage.getItem('dailySpending') || '{}');

    // Clean up old days (keep only last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const cleanedData = {};
    for (const [date, value] of Object.entries(data)) {
        if (new Date(date) >= sevenDaysAgo) {
            cleanedData[date] = value;
        }
    }

    cleanedData[today] = (cleanedData[today] || 0) + amount;
    localStorage.setItem('dailySpending', JSON.stringify(cleanedData));
}

// Check if payment is allowed
function checkPaymentAllowed(amountTHB) {
    const userLimits = getUserLimits();
    const dailySpent = getDailySpent();

    // 1. Check system single limit
    if (amountTHB > SYSTEM_LIMITS.SINGLE_MAX) {
        return {
            allowed: false,
            reason: 'SYSTEM_SINGLE_LIMIT',
            message: `单笔不能超过 ฿${SYSTEM_LIMITS.SINGLE_MAX.toLocaleString()}`
        };
    }

    // 2. Check user single limit
    if (amountTHB > userLimits.singleMax) {
        return {
            allowed: false,
            reason: 'USER_SINGLE_LIMIT',
            message: `超出您设定的单笔限额 ฿${userLimits.singleMax.toLocaleString()}`
        };
    }

    // 3. Check system daily limit
    if (dailySpent + amountTHB > SYSTEM_LIMITS.DAILY_MAX) {
        return {
            allowed: false,
            reason: 'SYSTEM_DAILY_LIMIT',
            message: `今日累计不能超过 ฿${SYSTEM_LIMITS.DAILY_MAX.toLocaleString()}`
        };
    }

    // 4. Check user daily limit
    if (dailySpent + amountTHB > userLimits.dailyMax) {
        return {
            allowed: false,
            reason: 'USER_DAILY_LIMIT',
            message: `超出您设定的每日限额 ฿${userLimits.dailyMax.toLocaleString()}`
        };
    }

    // Calculate remaining
    const remainingSingle = Math.min(userLimits.singleMax, SYSTEM_LIMITS.SINGLE_MAX);
    const remainingDaily = Math.min(
        userLimits.dailyMax - dailySpent,
        SYSTEM_LIMITS.DAILY_MAX - dailySpent
    );

    return {
        allowed: true,
        remaining: {
            single: remainingSingle,
            daily: Math.max(0, remainingDaily)
        },
        dailySpent
    };
}

// Get limit status for display
function getLimitStatus() {
    const userLimits = getUserLimits();
    const dailySpent = getDailySpent();

    return {
        userLimits,
        systemLimits: SYSTEM_LIMITS,
        dailySpent,
        remainingDaily: Math.max(0, Math.min(
            userLimits.dailyMax - dailySpent,
            SYSTEM_LIMITS.DAILY_MAX - dailySpent
        ))
    };
}

// Export for use in HTML
window.BoonLinkLimits = {
    SYSTEM_LIMITS,
    getUserLimits,
    setUserLimits,
    getDailySpent,
    addDailySpent,
    checkPaymentAllowed,
    getLimitStatus
};

// Also make checkPaymentAllowed globally available for wallet.js
window.checkPaymentAllowed = checkPaymentAllowed;
