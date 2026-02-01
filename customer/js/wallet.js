// BoonLink Wallet Connection + EIP-712 Signing
// BSC Only - Self-Custody Wallet

const BSC_CONFIG = {
    chainId: 56,
    chainIdHex: '0x38',
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org/',
    blockExplorer: 'https://bscscan.com',
    tokens: {
        USDT: {
            address: '0x55d398326f99059fF775485246999027B3197955',
            decimals: 18,
            symbol: 'USDT'
        },
        USDC: {
            address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
            decimals: 18,
            symbol: 'USDC'
        }
    }
};

// Wallet state
let walletState = {
    isConnected: false,
    address: null,
    provider: null
};

// Connect wallet
async function connectWallet() {
    if (!window.ethereum) {
        throw new Error('请安装 MetaMask 或其他 Web3 钱包');
    }

    try {
        // Request accounts
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        // Switch to BSC
        await ensureBSCNetwork();

        walletState = {
            isConnected: true,
            address: accounts[0],
            provider: window.ethereum
        };

        // Save state
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', accounts[0]);

        return walletState;
    } catch (error) {
        console.error('钱包连接失败:', error);
        throw error;
    }
}

// Ensure BSC network
async function ensureBSCNetwork() {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });

    if (chainId !== BSC_CONFIG.chainIdHex) {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BSC_CONFIG.chainIdHex }]
            });
        } catch (error) {
            if (error.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: BSC_CONFIG.chainIdHex,
                        chainName: BSC_CONFIG.name,
                        rpcUrls: [BSC_CONFIG.rpcUrl],
                        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                        blockExplorerUrls: [BSC_CONFIG.blockExplorer]
                    }]
                });
            } else {
                throw error;
            }
        }
    }
}

// Get token balance
async function getTokenBalance(tokenSymbol) {
    if (!walletState.isConnected) throw new Error('钱包未连接');

    const token = BSC_CONFIG.tokens[tokenSymbol];
    if (!token) throw new Error('不支持的代币');

    // ERC20 balanceOf ABI
    const data = '0x70a08231' + walletState.address.slice(2).padStart(64, '0');

    try {
        const result = await window.ethereum.request({
            method: 'eth_call',
            params: [{
                to: token.address,
                data: data
            }, 'latest']
        });

        // Convert hex to decimal
        const balance = parseInt(result, 16);
        return (balance / Math.pow(10, token.decimals)).toFixed(2);
    } catch (error) {
        console.error('获取余额失败:', error);
        return '0.00';
    }
}

// Generate unique order ID
function generateOrderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `BL_${timestamp}_${random}`;
}

// EIP-712 Offline Signing
async function signOfflinePayment(paymentData) {
    if (!walletState.address) throw new Error('钱包未连接');

    // EIP-712 Domain
    const domain = {
        name: 'BoonLink',
        version: '1',
        chainId: BSC_CONFIG.chainId,
        verifyingContract: '0x0000000000000000000000000000000000000000'
    };

    // Types
    const types = {
        EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
        ],
        Payment: [
            { name: 'orderId', type: 'string' },
            { name: 'nonce', type: 'uint256' },
            { name: 'amountTHB', type: 'uint256' },
            { name: 'amountCrypto', type: 'string' },
            { name: 'token', type: 'address' },
            { name: 'recipient', type: 'string' },
            { name: 'note', type: 'string' },
            { name: 'deadline', type: 'uint256' }
        ]
    };

    const message = {
        orderId: paymentData.orderId,
        nonce: paymentData.nonce,
        amountTHB: Math.round(paymentData.amountTHB * 100), // Store as cents
        amountCrypto: paymentData.amountCrypto,
        token: paymentData.token,
        recipient: paymentData.recipient,
        note: paymentData.note || '',
        deadline: paymentData.deadline
    };

    const msgParams = JSON.stringify({
        types,
        primaryType: 'Payment',
        domain,
        message
    });

    try {
        const signature = await window.ethereum.request({
            method: 'eth_signTypedData_v4',
            params: [walletState.address, msgParams]
        });

        return {
            ...paymentData,
            signature,
            signer: walletState.address
        };
    } catch (error) {
        console.error('签名失败:', error);
        throw error;
    }
}

// Create offline payment QR data
async function createOfflinePaymentQR(amountTHB, tokenSymbol, promptPayId, note) {
    // Check limits first
    const limitCheck = checkPaymentAllowed(amountTHB);
    if (!limitCheck.allowed) {
        throw new Error(limitCheck.message);
    }

    const token = BSC_CONFIG.tokens[tokenSymbol];
    const orderId = generateOrderId();
    const nonce = parseInt(localStorage.getItem('paymentNonce') || '0') + 1;
    const deadline = Math.floor(Date.now() / 1000) + 600; // 10 min expiry

    // Get exchange rate (demo: 1 USDT = 35 THB)
    const exchangeRate = 35;
    const amountCrypto = (amountTHB / exchangeRate).toFixed(2);

    const paymentData = {
        orderId,
        nonce,
        amountTHB,
        amountCrypto,
        token: token.address,
        tokenSymbol,
        recipient: promptPayId,
        note: note || '',
        deadline
    };

    // Sign the payment
    const signedData = await signOfflinePayment(paymentData);

    // Save nonce
    localStorage.setItem('paymentNonce', nonce.toString());

    // Return QR data
    return JSON.stringify({
        type: 'BOONLINK_PAYMENT',
        version: 1,
        data: signedData
    });
}

// Check if wallet was previously connected
async function checkPreviousConnection() {
    const wasConnected = localStorage.getItem('walletConnected') === 'true';
    const savedAddress = localStorage.getItem('walletAddress');

    if (wasConnected && window.ethereum && savedAddress) {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });

            if (accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
                walletState = {
                    isConnected: true,
                    address: accounts[0],
                    provider: window.ethereum
                };
                return walletState;
            }
        } catch (e) {
            console.log('Auto-reconnect failed');
        }
    }
    return null;
}

// Disconnect wallet
function disconnectWallet() {
    walletState = {
        isConnected: false,
        address: null,
        provider: null
    };
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
}

// Export for use in HTML
window.BoonLinkWallet = {
    connect: connectWallet,
    disconnect: disconnectWallet,
    getBalance: getTokenBalance,
    sign: signOfflinePayment,
    createPaymentQR: createOfflinePaymentQR,
    checkConnection: checkPreviousConnection,
    getState: () => walletState,
    BSC_CONFIG
};
