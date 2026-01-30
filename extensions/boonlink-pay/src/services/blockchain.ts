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
