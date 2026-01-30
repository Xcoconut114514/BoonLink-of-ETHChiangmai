/**
 * Settlement Service
 * Handles fiat settlement to merchant's PromptPay account
 */

import type { PromptPayData, PaymentOrder, BoonLinkConfig } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Settlement result
 */
export interface SettlementResult {
  success: boolean;
  settlementId?: string;
  transactionRef?: string;
  timestamp?: number;
  error?: string;
}

/**
 * Settlement service interface
 */
export interface ISettlementService {
  /**
   * Execute settlement to merchant's PromptPay account
   */
  settle(order: PaymentOrder): Promise<SettlementResult>;

  /**
   * Check settlement status
   */
  checkStatus(settlementId: string): Promise<SettlementResult>;
}

/**
 * Mock Settlement Service (for demo)
 * Simulates PromptPay transfer
 */
export class MockSettlementService implements ISettlementService {
  private settlements: Map<string, SettlementResult> = new Map();

  async settle(order: PaymentOrder): Promise<SettlementResult> {
    // Simulate processing delay
    await this.simulateDelay(1000);

    // Random success (95% success rate for demo)
    const success = Math.random() > 0.05;

    const settlementId = uuidv4();
    const result: SettlementResult = success
      ? {
          success: true,
          settlementId,
          transactionRef: `PP${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          timestamp: Date.now(),
        }
      : {
          success: false,
          error: 'Settlement failed: Bank timeout (mock)',
        };

    this.settlements.set(settlementId, result);
    return result;
  }

  async checkStatus(settlementId: string): Promise<SettlementResult> {
    await this.simulateDelay(200);

    const result = this.settlements.get(settlementId);
    if (!result) {
      return {
        success: false,
        error: 'Settlement not found',
      };
    }
    return result;
  }

  private async simulateDelay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Real PromptPay Settlement Service
 * Integrates with Thai banking APIs
 *
 * Note: In production, this would connect to:
 * 1. Bank of Thailand's Interbank API
 * 2. Partner bank's corporate banking API
 * 3. Third-party payment gateway (e.g., 2C2P, Omise)
 */
export class PromptPaySettlementService implements ISettlementService {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async settle(order: PaymentOrder): Promise<SettlementResult> {
    try {
      // In production, this would make actual API calls
      // For now, we'll use the mock implementation
      console.log('Production settlement not implemented, using mock');

      const mockService = new MockSettlementService();
      return mockService.settle(order);
    } catch (error) {
      return {
        success: false,
        error: `Settlement error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }

  async checkStatus(settlementId: string): Promise<SettlementResult> {
    try {
      // In production, this would check with the bank
      const mockService = new MockSettlementService();
      return mockService.checkStatus(settlementId);
    } catch (error) {
      return {
        success: false,
        error: `Status check error: ${error instanceof Error ? error.message : 'Unknown'}`,
      };
    }
  }
}

/**
 * 2C2P Payment Gateway Integration
 * Popular payment gateway in Thailand
 */
export class TwoCTwoPSettlementService implements ISettlementService {
  private merchantId: string;
  private secretKey: string;
  private apiUrl = 'https://sandbox-pgw.2c2p.com/payment/4.1';

  constructor(merchantId: string, secretKey: string) {
    this.merchantId = merchantId;
    this.secretKey = secretKey;
  }

  async settle(order: PaymentOrder): Promise<SettlementResult> {
    // 2C2P integration would go here
    // For hackathon, we use mock
    const mockService = new MockSettlementService();
    return mockService.settle(order);
  }

  async checkStatus(settlementId: string): Promise<SettlementResult> {
    const mockService = new MockSettlementService();
    return mockService.checkStatus(settlementId);
  }
}

/**
 * Create settlement service based on config
 */
export function createSettlementService(config: BoonLinkConfig): ISettlementService {
  if (config.demoMode) {
    return new MockSettlementService();
  }

  // Production would use real service
  if (config.settlementApiUrl) {
    return new PromptPaySettlementService(
      config.settlementApiUrl,
      process.env.SETTLEMENT_API_KEY || ''
    );
  }

  // Fallback to mock
  return new MockSettlementService();
}

/**
 * Format settlement reference for display
 */
export function formatSettlementRef(ref: string): string {
  if (ref.length <= 8) return ref;
  return `${ref.slice(0, 4)}-${ref.slice(4, 8)}-${ref.slice(8)}`;
}

/**
 * Generate receipt data for completed settlement
 */
export function generateReceiptData(
  order: PaymentOrder,
  settlement: SettlementResult
): {
  orderId: string;
  merchant: string;
  amountTHB: string;
  amountCrypto: string;
  token: string;
  txHash: string;
  settlementRef: string;
  timestamp: string;
} {
  const date = new Date(settlement.timestamp || Date.now());
  const formattedDate = date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    orderId: order.id.slice(0, 8),
    merchant: order.quote.promptPay.merchantName || formatPromptPayId(order.quote.promptPay),
    amountTHB: `฿${order.quote.amountTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
    amountCrypto: `${order.quote.amountCrypto.toFixed(order.quote.token === 'ETH' ? 6 : 2)} ${order.quote.token}`,
    token: order.quote.token,
    txHash: order.txHash || '',
    settlementRef: settlement.transactionRef || '',
    timestamp: formattedDate,
  };
}

/**
 * Format PromptPay ID for display
 */
function formatPromptPayId(promptPay: PromptPayData): string {
  if (promptPay.accountType === 'phone') {
    const phone = promptPay.accountId;
    return `${phone.slice(0, 3)}-xxx-${phone.slice(-4)}`;
  }
  return `ID: ${promptPay.accountId.slice(0, 4)}****`;
}
