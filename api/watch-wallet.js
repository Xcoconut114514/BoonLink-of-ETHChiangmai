// Vercel Serverless Function - Watch BSC Wallet for incoming transfers
// Monitors 0x6778404839E5D817c35ba72Fa5cD45a2716d9905 for ERC20 transfers

const MERCHANT_WALLET = '0x6778404839E5D817c35ba72Fa5cD45a2716d9905';
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || 'YourApiKeyToken'; // Free tier works

// Token contracts on BSC
const TOKENS = {
    '0x55d398326f99059fF775485246999027B3197955': { symbol: 'USDT', decimals: 18 },
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d': { symbol: 'USDC', decimals: 18 },
    '0x2170Ed0880ac9A755fd29B2688956BD959F933F8': { symbol: 'ETH', decimals: 18 },
};

// In-memory cache of processed tx hashes
let processedTxs = new Set();
let lastBlock = 0;

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const since = parseInt(req.query.since) || 0;
    
    try {
        // Get latest ERC20 token transfers TO our wallet
        const transfers = await getLatestTransfers(since);
        
        // Filter out already processed
        const newTransfers = transfers.filter(tx => !processedTxs.has(tx.hash));
        
        // Mark as processed
        newTransfers.forEach(tx => processedTxs.add(tx.hash));
        
        // Cleanup old processed txs (keep last 100)
        if (processedTxs.size > 100) {
            const arr = Array.from(processedTxs);
            processedTxs = new Set(arr.slice(-100));
        }
        
        console.log(`💰 Wallet monitor: Found ${newTransfers.length} new transfers`);
        
        return res.status(200).json({
            wallet: MERCHANT_WALLET,
            transfers: newTransfers,
            timestamp: Date.now(),
            count: newTransfers.length
        });
        
    } catch (error) {
        console.error('Watch wallet error:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function getLatestTransfers(sinceTimestamp) {
    const transfers = [];
    
    // Query BscScan for ERC20 token transfers TO our address
    const url = `https://api.bscscan.com/api?module=account&action=tokentx&address=${MERCHANT_WALLET}&page=1&offset=10&sort=desc&apikey=${BSCSCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result) {
        for (const tx of data.result) {
            // Only incoming transfers (to our wallet)
            if (tx.to.toLowerCase() !== MERCHANT_WALLET.toLowerCase()) continue;
            
            // Only after since timestamp
            const txTime = parseInt(tx.timeStamp) * 1000;
            if (txTime <= sinceTimestamp) continue;
            
            // Get token info
            const tokenInfo = TOKENS[tx.contractAddress] || { 
                symbol: tx.tokenSymbol || 'TOKEN', 
                decimals: parseInt(tx.tokenDecimal) || 18 
            };
            
            // Calculate amount
            const rawAmount = BigInt(tx.value);
            const divisor = BigInt(10 ** tokenInfo.decimals);
            const amount = Number(rawAmount) / Number(divisor);
            
            // Estimate THB value (simplified - assume 1 USDT = 35 THB)
            let thbAmount = 0;
            if (tokenInfo.symbol === 'USDT' || tokenInfo.symbol === 'USDC') {
                thbAmount = Math.round(amount * 35);
            } else if (tokenInfo.symbol === 'ETH') {
                thbAmount = Math.round(amount * 3500 * 35); // Rough ETH price
            }
            
            transfers.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                token: tokenInfo.symbol,
                amount: amount.toFixed(6),
                amountTHB: thbAmount,
                timestamp: txTime,
                blockNumber: tx.blockNumber
            });
        }
    }
    
    // Also check native BNB transfers
    const bnbUrl = `https://api.bscscan.com/api?module=account&action=txlist&address=${MERCHANT_WALLET}&page=1&offset=10&sort=desc&apikey=${BSCSCAN_API_KEY}`;
    
    const bnbResponse = await fetch(bnbUrl);
    const bnbData = await bnbResponse.json();
    
    if (bnbData.status === '1' && bnbData.result) {
        for (const tx of bnbData.result) {
            // Only incoming transfers with value
            if (tx.to.toLowerCase() !== MERCHANT_WALLET.toLowerCase()) continue;
            if (tx.value === '0') continue;
            
            const txTime = parseInt(tx.timeStamp) * 1000;
            if (txTime <= sinceTimestamp) continue;
            
            // Don't duplicate if already processed
            if (transfers.find(t => t.hash === tx.hash)) continue;
            
            const amount = Number(BigInt(tx.value)) / 1e18;
            const thbAmount = Math.round(amount * 600 * 35); // Rough BNB price
            
            transfers.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                token: 'BNB',
                amount: amount.toFixed(6),
                amountTHB: thbAmount,
                timestamp: txTime,
                blockNumber: tx.blockNumber
            });
        }
    }
    
    return transfers.sort((a, b) => b.timestamp - a.timestamp);
}
