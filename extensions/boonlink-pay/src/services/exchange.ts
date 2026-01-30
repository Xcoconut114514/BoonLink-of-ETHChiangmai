/**
 * Exchange Rate Service
 * Handles crypto-to-fiat rate fetching and caching
 */

import type {
  ExchangeRate,
  PaymentQuote,
  PromptPayData,
  SupportedToken,
  BoonLinkConfig,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

// Rate validity period (5 minutes)
const RATE_VALIDITY_MS = 5 * 60 * 1000;

// Quote validity period (3 minutes)
const QUOTE_VALIDITY_MS = 3 * 60 * 1000;

// Service fee percentage
const SERVICE_FEE_PERCENT = 0.5;

// Network fee estimates (in THB equivalent)
const NETWORK_FEE_ESTIMATES: Record<SupportedToken, number> = {
  USDT: 5, // BEP-20 transfer
  USDC: 5, // BEP-20 transfer
  ETH: 15, // Higher gas for native
};

/**
 * Mock exchange rates for demo mode
 * Based on approximate real-world rates as of 2025
 */
const MOCK_RATES: Record<SupportedToken, number> = {
  USDT: 35.5, // 1 USDT = 35.5 THB
  USDC: 35.5, // 1 USDC = 35.5 THB
  ETH: 120000, // 1 ETH = 120,000 THB (~$3,380 USD)
};

/**
 * Rate cache
 */
const rateCache = new Map<string, ExchangeRate>();

/**
 * Exchange service interface
 */
export interface IExchangeService {
  getRate(token: SupportedToken): Promise<ExchangeRate>;
  createQuote(
    amountTHB: number,
    token: SupportedToken,
    promptPay: PromptPayData
  ): Promise<PaymentQuote>;
}

/**
 * Mock Exchange Service (for demo/hackathon)
 */
export class MockExchangeService implements IExchangeService {
  private addRandomVariance(rate: number, maxPercent: number = 0.5): number {
    const variance = (Math.random() - 0.5) * 2 * (maxPercent / 100);
    return rate * (1 + variance);
  }

  async getRate(token: SupportedToken): Promise<ExchangeRate> {
    // Check cache first
    const cacheKey = `${token}_THB`;
    const cached = rateCache.get(cacheKey);

    if (cached && cached.validUntil > Date.now()) {
      return cached;
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

    const baseRate = MOCK_RATES[token];
    const rate = this.addRandomVariance(baseRate);
    const now = Date.now();

    const exchangeRate: ExchangeRate = {
      token,
      fiat: 'THB',
      rate,
      source: 'mock',
      timestamp: now,
      validUntil: now + RATE_VALIDITY_MS,
    };

    // Cache the rate
    rateCache.set(cacheKey, exchangeRate);

    return exchangeRate;
  }

  async createQuote(
    amountTHB: number,
    token: SupportedToken,
    promptPay: PromptPayData
  ): Promise<PaymentQuote> {
    const rate = await this.getRate(token);

    // Calculate crypto amount
    const amountCrypto = amountTHB / rate.rate;

    // Calculate fees
    const networkFee = NETWORK_FEE_ESTIMATES[token] / rate.rate;
    const serviceFee = amountCrypto * (SERVICE_FEE_PERCENT / 100);
    const totalFee = networkFee + serviceFee;

    const now = Date.now();

    return {
      id: uuidv4(),
      amountTHB,
      amountCrypto: amountCrypto + totalFee,
      token,
      rate,
      fee: {
        network: networkFee,
        service: serviceFee,
        total: totalFee,
      },
      promptPay,
      createdAt: now,
      expiresAt: now + QUOTE_VALIDITY_MS,
    };
  }
}

/**
 * Bitkub Exchange Service (for production)
 * Thai local exchange with THB pairs
 */
export class BitkubExchangeService implements IExchangeService {
  private apiUrl = 'https://api.bitkub.com/api';

  private tokenSymbols: Record<SupportedToken, string> = {
    USDT: 'THB_USDT',
    USDC: 'THB_USDC',
    ETH: 'THB_ETH',
  };

  async getRate(token: SupportedToken): Promise<ExchangeRate> {
    const cacheKey = `${token}_THB`;
    const cached = rateCache.get(cacheKey);

    if (cached && cached.validUntil > Date.now()) {
      return cached;
    }

    try {
      const response = await fetch(`${this.apiUrl}/market/ticker`);
      const data = await response.json();

      const symbol = this.tokenSymbols[token];
      const ticker = data[symbol];

      if (!ticker) {
        throw new Error(`No ticker data for ${symbol}`);
      }

      const now = Date.now();
      const exchangeRate: ExchangeRate = {
        token,
        fiat: 'THB',
        rate: ticker.last,
        source: 'bitkub',
        timestamp: now,
        validUntil: now + RATE_VALIDITY_MS,
      };

      rateCache.set(cacheKey, exchangeRate);
      return exchangeRate;
    } catch (error) {
      // Fallback to mock if API fails
      console.error('Bitkub API error, falling back to mock:', error);
      const mockService = new MockExchangeService();
      return mockService.getRate(token);
    }
  }

  async createQuote(
    amountTHB: number,
    token: SupportedToken,
    promptPay: PromptPayData
  ): Promise<PaymentQuote> {
    const rate = await this.getRate(token);
    const amountCrypto = amountTHB / rate.rate;

    const networkFee = NETWORK_FEE_ESTIMATES[token] / rate.rate;
    const serviceFee = amountCrypto * (SERVICE_FEE_PERCENT / 100);
    const totalFee = networkFee + serviceFee;

    const now = Date.now();

    return {
      id: uuidv4(),
      amountTHB,
      amountCrypto: amountCrypto + totalFee,
      token,
      rate,
      fee: {
        network: networkFee,
        service: serviceFee,
        total: totalFee,
      },
      promptPay,
      createdAt: now,
      expiresAt: now + QUOTE_VALIDITY_MS,
    };
  }
}

/**
 * CoinGecko Exchange Service (free, no API key)
 */
export class CoinGeckoExchangeService implements IExchangeService {
  private apiUrl = 'https://api.coingecko.com/api/v3';

  private tokenIds: Record<SupportedToken, string> = {
    USDT: 'tether',
    USDC: 'usd-coin',
    ETH: 'ethereum',
  };

  async getRate(token: SupportedToken): Promise<ExchangeRate> {
    const cacheKey = `${token}_THB`;
    const cached = rateCache.get(cacheKey);

    if (cached && cached.validUntil > Date.now()) {
      return cached;
    }

    try {
      const tokenId = this.tokenIds[token];
      const response = await fetch(
        `${this.apiUrl}/simple/price?ids=${tokenId}&vs_currencies=thb`
      );
      const data = await response.json();

      const rate = data[tokenId]?.thb;
      if (!rate) {
        throw new Error(`No rate data for ${token}`);
      }

      const now = Date.now();
      const exchangeRate: ExchangeRate = {
        token,
        fiat: 'THB',
        rate,
        source: 'coingecko',
        timestamp: now,
        validUntil: now + RATE_VALIDITY_MS,
      };

      rateCache.set(cacheKey, exchangeRate);
      return exchangeRate;
    } catch (error) {
      console.error('CoinGecko API error, falling back to mock:', error);
      const mockService = new MockExchangeService();
      return mockService.getRate(token);
    }
  }

  async createQuote(
    amountTHB: number,
    token: SupportedToken,
    promptPay: PromptPayData
  ): Promise<PaymentQuote> {
    const rate = await this.getRate(token);
    const amountCrypto = amountTHB / rate.rate;

    const networkFee = NETWORK_FEE_ESTIMATES[token] / rate.rate;
    const serviceFee = amountCrypto * (SERVICE_FEE_PERCENT / 100);
    const totalFee = networkFee + serviceFee;

    const now = Date.now();

    return {
      id: uuidv4(),
      amountTHB,
      amountCrypto: amountCrypto + totalFee,
      token,
      rate,
      fee: {
        network: networkFee,
        service: serviceFee,
        total: totalFee,
      },
      promptPay,
      createdAt: now,
      expiresAt: now + QUOTE_VALIDITY_MS,
    };
  }
}

/**
 * Create exchange service based on config
 */
export function createExchangeService(config: BoonLinkConfig): IExchangeService {
  if (config.demoMode) {
    return new MockExchangeService();
  }

  // Production: try Bitkub first, fallback to CoinGecko
  return new BitkubExchangeService();
}

/**
 * Format rate for display
 */
export function formatRate(rate: ExchangeRate): string {
  if (rate.token === 'ETH') {
    return `1 ${rate.token} = ฿${rate.rate.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return `1 ${rate.token} = ฿${rate.rate.toFixed(2)}`;
}

/**
 * Format crypto amount for display
 */
export function formatCryptoAmount(amount: number, token: SupportedToken): string {
  const decimals = token === 'ETH' ? 6 : 2;
  return `${amount.toFixed(decimals)} ${token}`;
}
