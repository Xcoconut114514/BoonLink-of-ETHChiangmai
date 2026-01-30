/**
 * Blockchain Service
 * Handles crypto transactions on BSC network
 */

import { ethers, JsonRpcProvider, Wallet, Contract } from 'ethers';
import type {
  SupportedToken,
  TransactionSignature,
  SUPPORTED_TOKENS,
  BoonLinkConfig,
} from '../types/index.js';

// BSC Network Configuration
const BSC_CONFIG = {
  mainnet: {
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    name: 'BSC Mainnet',
  },
  testnet: {
    chainId: 97,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    name: 'BSC Testnet',
  },
};

// ERC20 ABI (minimal)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// Token addresses on BSC
const TOKEN_ADDRESSES: Record<SupportedToken, string | null> = {
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  ETH: null, // Native BNB (treated as ETH-like)
};

/**
 * Blockchain service interface
 */
export interface IBlockchainService {
  getBalance(address: string, token: SupportedToken): Promise<number>;
  createTransferTx(
    from: string,
    to: string,
    amount: number,
    token: SupportedToken
  ): Promise<ethers.TransactionRequest>;
  signTransaction(tx: ethers.TransactionRequest, privateKey: string): Promise<TransactionSignature>;
  broadcastTransaction(signedTx: string): Promise<string>;
  waitForConfirmation(txHash: string, confirmations?: number): Promise<boolean>;
}

/**
 * Real Blockchain Service (BSC)
 */
export class BSCBlockchainService implements IBlockchainService {
  private provider: JsonRpcProvider;
  private chainId: number;

  constructor(testnet: boolean = false) {
    const config = testnet ? BSC_CONFIG.testnet : BSC_CONFIG.mainnet;
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.chainId = config.chainId;
  }

  async getBalance(address: string, token: SupportedToken): Promise<number> {
    const tokenAddress = TOKEN_ADDRESSES[token];

    if (!tokenAddress) {
      // Native BNB balance
      const balance = await this.provider.getBalance(address);
      return parseFloat(ethers.formatEther(balance));
    }

    // ERC20 token balance
    const contract = new Contract(tokenAddress, ERC20_ABI, this.provider);
    const balance = await contract.balanceOf(address);
    return parseFloat(ethers.formatUnits(balance, 18));
  }

  async createTransferTx(
    from: string,
    to: string,
    amount: number,
    token: SupportedToken
  ): Promise<ethers.TransactionRequest> {
    const tokenAddress = TOKEN_ADDRESSES[token];
    const nonce = await this.provider.getTransactionCount(from);
    const gasPrice = await this.provider.getFeeData();

    if (!tokenAddress) {
      // Native transfer
      return {
        from,
        to,
        value: ethers.parseEther(amount.toString()),
        nonce,
        gasLimit: 21000n,
        gasPrice: gasPrice.gasPrice,
        chainId: this.chainId,
      };
    }

    // ERC20 transfer
    const contract = new Contract(tokenAddress, ERC20_ABI, this.provider);
    const data = contract.interface.encodeFunctionData('transfer', [
      to,
      ethers.parseUnits(amount.toString(), 18),
    ]);

    return {
      from,
      to: tokenAddress,
      data,
      nonce,
      gasLimit: 100000n, // ERC20 transfers need more gas
      gasPrice: gasPrice.gasPrice,
      chainId: this.chainId,
    };
  }

  async signTransaction(
    tx: ethers.TransactionRequest,
    privateKey: string
  ): Promise<TransactionSignature> {
    const wallet = new Wallet(privateKey, this.provider);
    const signedTx = await wallet.signTransaction(tx);

    return {
      signedTx,
      from: wallet.address,
      to: tx.to as string,
      nonce: tx.nonce as number,
      gasLimit: tx.gasLimit?.toString() || '0',
      gasPrice: tx.gasPrice?.toString() || '0',
      chainId: this.chainId,
      signedAt: Date.now(),
    };
  }

  async broadcastTransaction(signedTx: string): Promise<string> {
    const txResponse = await this.provider.broadcastTransaction(signedTx);
    return txResponse.hash;
  }

  async waitForConfirmation(txHash: string, confirmations: number = 3): Promise<boolean> {
    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations, 60000);
      return receipt !== null && receipt.status === 1;
    } catch {
      return false;
    }
  }
}

/**
 * Mock Blockchain Service (for demo)
 */
export class MockBlockchainService implements IBlockchainService {
  private mockBalances: Map<string, Map<SupportedToken, number>> = new Map();
  private mockTxCount = 0;

  constructor() {
    // Initialize with some mock balances
    this.setMockBalance('0xDemo...User', 'USDT', 1000);
    this.setMockBalance('0xDemo...User', 'USDC', 500);
    this.setMockBalance('0xDemo...User', 'ETH', 1.5);
  }

  setMockBalance(address: string, token: SupportedToken, amount: number): void {
    if (!this.mockBalances.has(address)) {
      this.mockBalances.set(address, new Map());
    }
    this.mockBalances.get(address)!.set(token, amount);
  }

  async getBalance(address: string, token: SupportedToken): Promise<number> {
    await this.simulateDelay();
    return this.mockBalances.get(address)?.get(token) || 100; // Default balance for demo
  }

  async createTransferTx(
    from: string,
    to: string,
    amount: number,
    token: SupportedToken
  ): Promise<ethers.TransactionRequest> {
    await this.simulateDelay();

    return {
      from,
      to: TOKEN_ADDRESSES[token] || to,
      value: token === 'ETH' ? ethers.parseEther(amount.toString()) : 0n,
      nonce: this.mockTxCount++,
      gasLimit: 100000n,
      gasPrice: ethers.parseUnits('5', 'gwei'),
      chainId: 56,
      data:
        token !== 'ETH'
          ? '0xa9059cbb' + // transfer(address,uint256) selector
            to.slice(2).padStart(64, '0') +
            ethers.parseUnits(amount.toString(), 18).toString(16).padStart(64, '0')
          : undefined,
    };
  }

  async signTransaction(
    tx: ethers.TransactionRequest,
    _privateKey: string
  ): Promise<TransactionSignature> {
    await this.simulateDelay();

    // Generate a mock signed transaction
    const mockSignedTx = '0x' + 'f'.repeat(200) + Math.random().toString(16).slice(2, 10);

    return {
      signedTx: mockSignedTx,
      from: tx.from as string,
      to: tx.to as string,
      nonce: tx.nonce as number,
      gasLimit: tx.gasLimit?.toString() || '100000',
      gasPrice: tx.gasPrice?.toString() || '5000000000',
      chainId: 56,
      signedAt: Date.now(),
    };
  }

  async broadcastTransaction(_signedTx: string): Promise<string> {
    await this.simulateDelay(500);

    // Generate mock transaction hash
    const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    return txHash;
  }

  async waitForConfirmation(_txHash: string, _confirmations?: number): Promise<boolean> {
    // Simulate confirmation time
    await this.simulateDelay(2000);
    return true;
  }

  private async simulateDelay(ms: number = 100): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 100));
  }
}

/**
 * Create blockchain service based on config
 */
export function createBlockchainService(config: BoonLinkConfig): IBlockchainService {
  if (config.demoMode) {
    return new MockBlockchainService();
  }
  return new BSCBlockchainService();
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format transaction hash for display
 */
export function shortenTxHash(hash: string): string {
  if (!hash || hash.length < 10) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

/**
 * Get block explorer URL
 */
export function getExplorerUrl(txHash: string, testnet: boolean = false): string {
  const baseUrl = testnet ? 'https://testnet.bscscan.com' : 'https://bscscan.com';
  return `${baseUrl}/tx/${txHash}`;
}

// ============================================================================
// EIP-712 Typed Data Signing for Offline Payments
// ============================================================================

/**
 * EIP-712 Domain for BoonLink offline payments
 */
export const BOONLINK_DOMAIN = {
  name: 'BoonLink Payment',
  version: '1',
  chainId: 56, // BSC Mainnet
  verifyingContract: '0x0000000000000000000000000000000000000000', // Placeholder, updated at runtime
};

/**
 * EIP-712 Types for offline payment authorization
 */
export const PAYMENT_TYPES = {
  Payment: [
    { name: 'orderId', type: 'string' },
    { name: 'token', type: 'string' },
    { name: 'amount', type: 'uint256' },
    { name: 'recipient', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

/**
 * Offline payment message structure
 */
export interface OfflinePaymentMessage {
  orderId: string;
  token: string;
  amount: bigint;
  recipient: string;
  nonce: bigint;
  deadline: bigint;
}

/**
 * Signed offline payment data (for QR code)
 */
export interface SignedOfflinePayment {
  message: OfflinePaymentMessage;
  signature: string;
  signer: string;
  domain: typeof BOONLINK_DOMAIN;
}

/**
 * Create EIP-712 typed data hash for offline payment
 */
export function createPaymentTypedDataHash(
  message: OfflinePaymentMessage,
  domain: typeof BOONLINK_DOMAIN = BOONLINK_DOMAIN
): string {
  const domainSeparator = ethers.TypedDataEncoder.hashDomain(domain);
  const messageHash = ethers.TypedDataEncoder.hashStruct('Payment', PAYMENT_TYPES, message);
  
  return ethers.keccak256(
    ethers.concat([
      '0x1901',
      domainSeparator,
      messageHash,
    ])
  );
}

/**
 * Sign offline payment with EIP-712 (used by wallet/frontend)
 */
export async function signOfflinePayment(
  message: OfflinePaymentMessage,
  privateKey: string,
  domain: typeof BOONLINK_DOMAIN = BOONLINK_DOMAIN
): Promise<SignedOfflinePayment> {
  const wallet = new Wallet(privateKey);
  
  const signature = await wallet.signTypedData(
    domain,
    PAYMENT_TYPES,
    message
  );

  return {
    message,
    signature,
    signer: wallet.address,
    domain,
  };
}

/**
 * Verify EIP-712 signed offline payment (used by merchant/backend)
 * Returns the signer address if valid, null if invalid
 */
export function verifyOfflinePayment(
  signedPayment: SignedOfflinePayment
): { valid: boolean; signer: string | null; error?: string } {
  try {
    const { message, signature, signer: claimedSigner, domain } = signedPayment;
    
    // Check deadline
    if (message.deadline < BigInt(Math.floor(Date.now() / 1000))) {
      return { valid: false, signer: null, error: 'Payment authorization expired' };
    }

    // Recover signer from signature
    const recoveredAddress = ethers.verifyTypedData(
      domain,
      PAYMENT_TYPES,
      message,
      signature
    );

    // Verify signer matches
    if (recoveredAddress.toLowerCase() !== claimedSigner.toLowerCase()) {
      return { 
        valid: false, 
        signer: recoveredAddress, 
        error: `Signer mismatch: expected ${claimedSigner}, got ${recoveredAddress}` 
      };
    }

    return { valid: true, signer: recoveredAddress };
  } catch (error) {
    return { 
      valid: false, 
      signer: null, 
      error: `Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Create offline payment message for signing
 */
export function createOfflinePaymentMessage(
  orderId: string,
  token: SupportedToken,
  amountCrypto: number,
  recipientAddress: string,
  validityMinutes: number = 30
): OfflinePaymentMessage {
  const nonce = BigInt(Date.now());
  const deadline = BigInt(Math.floor(Date.now() / 1000) + validityMinutes * 60);
  
  return {
    orderId,
    token,
    amount: ethers.parseUnits(amountCrypto.toString(), 18),
    recipient: recipientAddress,
    nonce,
    deadline,
  };
}

/**
 * Encode signed payment to compact string for QR code
 */
export function encodeSignedPaymentForQR(signedPayment: SignedOfflinePayment): string {
  const data = {
    o: signedPayment.message.orderId,
    t: signedPayment.message.token,
    a: signedPayment.message.amount.toString(),
    r: signedPayment.message.recipient,
    n: signedPayment.message.nonce.toString(),
    d: signedPayment.message.deadline.toString(),
    s: signedPayment.signature,
    f: signedPayment.signer,
  };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decode signed payment from QR code string
 */
export function decodeSignedPaymentFromQR(qrData: string): SignedOfflinePayment | null {
  try {
    const decoded = JSON.parse(Buffer.from(qrData, 'base64').toString('utf8'));
    
    return {
      message: {
        orderId: decoded.o,
        token: decoded.t,
        amount: BigInt(decoded.a),
        recipient: decoded.r,
        nonce: BigInt(decoded.n),
        deadline: BigInt(decoded.d),
      },
      signature: decoded.s,
      signer: decoded.f,
      domain: BOONLINK_DOMAIN,
    };
  } catch {
    return null;
  }
}
