// BoonLink Wallet Connection + EIP-712 Signing
// BSC Only - Self-Custody Wallet
// Supports: MetaMask, OKX Wallet, Coinbase Wallet, Bitget Wallet

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
        },
        ETH: {
            address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
            decimals: 18,
            symbol: 'ETH',
            isNative: false
        }
    }
};

// Supported wallets configuration
const WALLET_PROVIDERS = {
    metamask: {
        name: 'MetaMask',
        icon: '🦊',
        color: '#F6851B',
        check: () => window.ethereum?.isMetaMask && !window.ethereum?.isOkxWallet && !window.ethereum?.isBitKeep,
        getProvider: () => window.ethereum
    },
    okx: {
        name: 'OKX Wallet',
        icon: '⚫',
        color: '#000000',
        check: () => window.okxwallet || window.ethereum?.isOkxWallet,
        getProvider: () => window.okxwallet || window.ethereum
    },
    coinbase: {
        name: 'Coinbase Wallet',
        icon: '🔵',
        color: '#0052FF',
        check: () => window.coinbaseWalletExtension || window.ethereum?.isCoinbaseWallet,
        getProvider: () => window.coinbaseWalletExtension || window.ethereum
    },
    bitget: {
        name: 'Bitget Wallet',
        icon: '💎',
        color: '#00D4AA',
        check: () => window.bitkeep?.ethereum || window.ethereum?.isBitKeep,
        getProvider: () => window.bitkeep?.ethereum || window.ethereum
    }
};

// Wallet state
let walletState = {
    isConnected: false,
    address: null,
    provider: null,
    walletType: null
};

// Detect available wallets
function detectWallets() {
    const available = [];
    for (const [key, wallet] of Object.entries(WALLET_PROVIDERS)) {
        if (wallet.check()) {
            available.push({
                id: key,
                ...wallet
            });
        }
    }
    // If no specific wallet detected but ethereum exists, add generic option
    if (available.length === 0 && window.ethereum) {
        available.push({
            id: 'generic',
            name: 'Web3 钱包',
            icon: '🔗',
            color: '#627EEA',
            getProvider: () => window.ethereum
        });
    }
    return available;
}

// Connect to specific wallet
async function connectWallet(walletId = null) {
    const availableWallets = detectWallets();
    
    if (availableWallets.length === 0) {
        throw new Error('请安装 MetaMask、OKX Wallet、Coinbase Wallet 或 Bitget Wallet');
    }

    // If walletId specified, find that wallet
    let selectedWallet;
    if (walletId) {
        selectedWallet = availableWallets.find(w => w.id === walletId);
        if (!selectedWallet) {
            throw new Error(`${walletId} 钱包未检测到`);
        }
    } else {
        // Use first available
        selectedWallet = availableWallets[0];
    }

    const provider = selectedWallet.getProvider();
    if (!provider) {
        throw new Error(`${selectedWallet.name} 连接失败`);
    }

    try {
        // Request accounts
        const accounts = await provider.request({
            method: 'eth_requestAccounts'
        });

        // Switch to BSC
        await ensureBSCNetwork(provider);

        walletState = {
            isConnected: true,
            address: accounts[0],
            provider: provider,
            walletType: selectedWallet.id,
            walletName: selectedWallet.name
        };

        // Save state
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', accounts[0]);
        localStorage.setItem('walletType', selectedWallet.id);

        return walletState;
    } catch (error) {
        console.error('钱包连接失败:', error);
        throw error;
    }
}

// Ensure BSC network
async function ensureBSCNetwork(provider = null) {
    const p = provider || walletState.provider || window.ethereum;
    const chainId = await p.request({ method: 'eth_chainId' });

    if (chainId !== BSC_CONFIG.chainIdHex) {
        try {
            await p.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BSC_CONFIG.chainIdHex }]
            });
        } catch (error) {
            if (error.code === 4902) {
                await p.request({
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
    
    const provider = walletState.provider || window.ethereum;
    const token = BSC_CONFIG.tokens[tokenSymbol];
    if (!token) throw new Error('不支持的代币');

    // ERC20 balanceOf ABI
    const data = '0x70a08231' + walletState.address.slice(2).padStart(64, '0');

    try {
        const result = await provider.request({
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
        const provider = walletState.provider || window.ethereum;
        const signature = await provider.request({
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
    const savedWalletType = localStorage.getItem('walletType');

    if (wasConnected && savedAddress) {
        // Try to find the saved wallet type
        let provider = null;
        if (savedWalletType && WALLET_PROVIDERS[savedWalletType]) {
            const wallet = WALLET_PROVIDERS[savedWalletType];
            if (wallet.check()) {
                provider = wallet.getProvider();
            }
        }
        // Fallback to window.ethereum
        if (!provider && window.ethereum) {
            provider = window.ethereum;
        }

        if (provider) {
            try {
                const accounts = await provider.request({
                    method: 'eth_accounts'
                });

                if (accounts.length > 0 && accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
                    walletState = {
                        isConnected: true,
                        address: accounts[0],
                        provider: provider,
                        walletType: savedWalletType || 'generic',
                        walletName: WALLET_PROVIDERS[savedWalletType]?.name || 'Web3 钱包'
                    };
                    return walletState;
                }
            } catch (e) {
                console.log('Auto-reconnect failed');
            }
        }
    }
    return null;
}

// Disconnect wallet
function disconnectWallet() {
    walletState = {
        isConnected: false,
        address: null,
        provider: null,
        walletType: null,
        walletName: null
    };
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletType');
}

// Export for use in HTML
window.BoonLinkWallet = {
    connect: connectWallet,
    disconnect: disconnectWallet,
    getBalance: getTokenBalance,
    sign: signOfflinePayment,
    createPaymentQR: createOfflinePaymentQR,
    checkConnection: checkPreviousConnection,
    detectWallets: detectWallets,
    getState: () => walletState,
    WALLET_PROVIDERS,
    BSC_CONFIG
};

// ============================================================================
// Real Transaction Functions
// ============================================================================

// Merchant wallet address (this would be the PromptPay recipient's crypto address)
// In production, this should be fetched from backend based on PromptPay ID
const MERCHANT_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f0aB3c'; // Demo address

// Sign and send real ERC20 transfer
async function signAndSendPayment(paymentData) {
    if (!walletState.isConnected) {
        throw new Error('钱包未连接');
    }

    const { amount, token, merchantId, merchantName, thbAmount } = paymentData;
    const tokenConfig = BSC_CONFIG.tokens[token];
    if (!tokenConfig) {
        throw new Error('不支持的代币');
    }

    const provider = walletState.provider || window.ethereum;

    // Ensure BSC network
    await ensureBSCNetwork(provider);

    // Convert amount to wei (18 decimals for BSC tokens)
    const amountInWei = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, tokenConfig.decimals)));
    const amountHex = '0x' + amountInWei.toString(16);

    // ERC20 transfer function signature: transfer(address to, uint256 amount)
    // Function selector: 0xa9059cbb
    const toAddress = MERCHANT_WALLET.slice(2).padStart(64, '0');
    const amountPadded = amountInWei.toString(16).padStart(64, '0');
    const data = '0xa9059cbb' + toAddress + amountPadded;

    // Estimate gas
    let gasEstimate;
    try {
        gasEstimate = await provider.request({
            method: 'eth_estimateGas',
            params: [{
                from: walletState.address,
                to: tokenConfig.address,
                data: data
            }]
        });
    } catch (e) {
        console.error('Gas estimation failed:', e);
        gasEstimate = '0x15F90'; // Default 90000
    }

    // Get gas price
    const gasPrice = await provider.request({
        method: 'eth_gasPrice'
    });

    // Build transaction
    const tx = {
        from: walletState.address,
        to: tokenConfig.address,
        data: data,
        gas: gasEstimate,
        gasPrice: gasPrice
    };

    // Send transaction - this will trigger wallet signature popup
    const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [tx]
    });

    console.log('Transaction sent:', txHash);

    // Wait for confirmation (optional, for better UX)
    // In production, you'd want to poll for receipt
    
    return txHash;
}

// Check token allowance (for future use with approve pattern)
async function checkAllowance(tokenSymbol, spender) {
    if (!walletState.isConnected) throw new Error('钱包未连接');
    
    const token = BSC_CONFIG.tokens[tokenSymbol];
    if (!token) throw new Error('不支持的代币');

    const provider = walletState.provider || window.ethereum;

    // allowance(address owner, address spender)
    const ownerPadded = walletState.address.slice(2).padStart(64, '0');
    const spenderPadded = spender.slice(2).padStart(64, '0');
    const data = '0xdd62ed3e' + ownerPadded + spenderPadded;

    const result = await provider.request({
        method: 'eth_call',
        params: [{
            to: token.address,
            data: data
        }, 'latest']
    });

    return BigInt(result);
}

// Approve token spending (for future use)
async function approveToken(tokenSymbol, spender, amount) {
    if (!walletState.isConnected) throw new Error('钱包未连接');
    
    const token = BSC_CONFIG.tokens[tokenSymbol];
    if (!token) throw new Error('不支持的代币');

    const provider = walletState.provider || window.ethereum;

    // approve(address spender, uint256 amount)
    const spenderPadded = spender.slice(2).padStart(64, '0');
    const amountPadded = BigInt(amount).toString(16).padStart(64, '0');
    const data = '0x095ea7b3' + spenderPadded + amountPadded;

    const tx = {
        from: walletState.address,
        to: token.address,
        data: data
    };

    return await provider.request({
        method: 'eth_sendTransaction',
        params: [tx]
    });
}
