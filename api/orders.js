// Vercel Serverless Function - Order Storage for Cross-Device Notification
// In-memory store (resets on cold start, but good for demo)
// For production, use Redis/Database

// Simple in-memory storage
let orders = [];
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup old orders
function cleanupOldOrders() {
    const cutoff = Date.now() - MAX_AGE_MS;
    orders = orders.filter(o => o.timestamp > cutoff);
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Cleanup old orders on each request
    cleanupOldOrders();
    
    if (req.method === 'POST') {
        // Customer submits a new order after payment
        try {
            const order = req.body;
            
            if (!order || !order.amountTHB) {
                return res.status(400).json({ error: 'Invalid order data' });
            }
            
            // Add server timestamp and ID
            order.id = 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            order.timestamp = Date.now();
            order.processed = false;
            
            orders.push(order);
            
            console.log('📦 New order received:', order.id, '- Amount:', order.amountTHB, 'THB');
            
            return res.status(200).json({ 
                success: true, 
                orderId: order.id,
                message: 'Order saved for merchant notification'
            });
        } catch (error) {
            console.error('Error saving order:', error);
            return res.status(500).json({ error: 'Failed to save order' });
        }
    }
    
    if (req.method === 'GET') {
        // Merchant polls for new orders
        const since = parseInt(req.query.since) || 0;
        const merchantId = req.query.merchantId || '';
        
        // Get unprocessed orders since timestamp
        let newOrders = orders.filter(o => 
            o.timestamp > since && 
            !o.processed &&
            (!merchantId || o.merchantId === merchantId)
        );
        
        // Mark as processed
        newOrders.forEach(o => {
            const orderInStore = orders.find(stored => stored.id === o.id);
            if (orderInStore) orderInStore.processed = true;
        });
        
        console.log('🔍 Merchant poll - Found', newOrders.length, 'new orders since', since);
        
        return res.status(200).json({
            orders: newOrders,
            timestamp: Date.now(),
            totalPending: orders.filter(o => !o.processed).length
        });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
