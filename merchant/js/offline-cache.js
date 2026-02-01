// BoonLink Merchant Offline Cache
// Prevents duplicate payments using IndexedDB

class OfflinePaymentCache {
    constructor() {
        this.dbName = 'BoonLinkMerchant';
        this.storeName = 'receivedPayments';
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'orderId' });
                    store.createIndex('timestamp', 'receivedAt', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                }
            };
        });
    }

    // Check if payment already exists
    async isDuplicate(orderId) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(orderId);

            request.onsuccess = () => {
                resolve(request.result ? {
                    isDuplicate: true,
                    previousTime: request.result.receivedAt
                } : {
                    isDuplicate: false
                });
            };

            request.onerror = () => resolve({ isDuplicate: false });
        });
    }

    // Save payment to cache
    async savePayment(paymentData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);

            const data = {
                orderId: paymentData.orderId,
                amountTHB: paymentData.amountTHB,
                note: paymentData.note || '',
                signer: paymentData.signer,
                receivedAt: Date.now(),
                status: 'pending' // pending -> confirmed -> failed
            };

            store.put(data);

            tx.oncomplete = () => resolve(data);
            tx.onerror = () => reject(tx.error);
        });
    }

    // Get all pending payments
    async getPendingPayments() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const index = store.index('status');
            const request = index.getAll('pending');

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    }

    // Update payment status
    async updateStatus(orderId, status) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.get(orderId);

            request.onsuccess = () => {
                const data = request.result;
                if (data) {
                    data.status = status;
                    data.updatedAt = Date.now();
                    store.put(data);
                }
            };

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // Get payment history (last N days)
    async getHistory(days = 7) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
                const filtered = (request.result || [])
                    .filter(p => p.receivedAt >= cutoff)
                    .sort((a, b) => b.receivedAt - a.receivedAt);
                resolve(filtered);
            };

            request.onerror = () => resolve([]);
        });
    }
}

// Validate incoming payment
async function validateIncomingPayment(paymentData, cache) {
    // 1. Check for duplicate
    const dupCheck = await cache.isDuplicate(paymentData.orderId);
    if (dupCheck.isDuplicate) {
        return {
            valid: false,
            error: 'DUPLICATE_PAYMENT',
            message: '⚠️ 此付款码已被扫描过！',
            previousTime: dupCheck.previousTime
        };
    }

    // 2. Check expiration (5 minutes from generation)
    const now = Date.now();
    const timestamp = paymentData.timestamp || 0;
    const fiveMinutes = 5 * 60 * 1000;
    
    if (timestamp && (now - timestamp) > fiveMinutes) {
        return {
            valid: false,
            error: 'EXPIRED',
            message: '⚠️ 此付款码已过期，请让顾客重新生成'
        };
    }

    // 3. Check amount limits (merchant side - just for display)
    if (paymentData.amountTHB > 5000) {
        return {
            valid: false,
            error: 'EXCEEDS_LIMIT',
            message: '⚠️ 金额超过单笔限额 ฿5,000'
        };
    }

    // 4. Validate basic data fields
    if (!paymentData.amountTHB || paymentData.amountTHB <= 0) {
        return {
            valid: false,
            error: 'INVALID_AMOUNT',
            message: '⚠️ 无效的付款金额'
        };
    }

    if (!paymentData.orderId) {
        return {
            valid: false,
            error: 'INVALID_ORDER',
            message: '⚠️ 无效的订单号'
        };
    }

    // Save to cache
    await cache.savePayment(paymentData);

    return {
        valid: true,
        message: '✅ 付款验证通过'
    };
}

// Export for use in HTML
window.OfflinePaymentCache = OfflinePaymentCache;
window.validateIncomingPayment = validateIncomingPayment;
