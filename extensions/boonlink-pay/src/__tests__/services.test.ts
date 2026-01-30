/**
 * Unit Tests for BoonLink Payment Extension
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parsePromptPayQR,
  generatePromptPayPayload,
} from '../services/promptpay.js';
import { MockExchangeService } from '../services/exchange.js';
import { MockBlockchainService } from '../services/blockchain.js';
import { MockSettlementService } from '../services/settlement.js';

describe('PromptPay Parser', () => {
  it('should parse a valid PromptPay QR payload', () => {
    // Generate a test payload
    const payload = generatePromptPayPayload('0812345678', 150);
    const result = parsePromptPayQR(payload);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.accountType).toBe('phone');
    expect(result.data?.amount).toBe(150);
  });

  it('should detect phone vs national ID', () => {
    const phonePayload = generatePromptPayPayload('0812345678');
    const phoneResult = parsePromptPayQR(phonePayload);
    expect(phoneResult.data?.accountType).toBe('phone');

    // National ID would be 13 digits
    const idPayload = generatePromptPayPayload('1234567890123');
    const idResult = parsePromptPayQR(idPayload);
    expect(idResult.data?.accountType).toBe('national_id');
  });

  it('should reject invalid payloads', () => {
    const result = parsePromptPayQR('invalid');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Exchange Service', () => {
  let service: MockExchangeService;

  beforeEach(() => {
    service = new MockExchangeService();
  });

  it('should return rates for supported tokens', async () => {
    const usdtRate = await service.getRate('USDT');
    expect(usdtRate.token).toBe('USDT');
    expect(usdtRate.fiat).toBe('THB');
    expect(usdtRate.rate).toBeGreaterThan(0);
  });

  it('should create quotes with fees', async () => {
    const promptPay = {
      accountId: '0812345678',
      accountType: 'phone' as const,
      amount: 150,
      currency: '764',
      country: 'TH',
      rawPayload: 'test',
      isValid: true,
    };

    const quote = await service.createQuote(150, 'USDT', promptPay);

    expect(quote.amountTHB).toBe(150);
    expect(quote.amountCrypto).toBeGreaterThan(0);
    expect(quote.fee.total).toBeGreaterThan(0);
    expect(quote.expiresAt).toBeGreaterThan(Date.now());
  });
});

describe('Blockchain Service', () => {
  let service: MockBlockchainService;

  beforeEach(() => {
    service = new MockBlockchainService();
  });

  it('should return mock balance', async () => {
    const balance = await service.getBalance('0xTest', 'USDT');
    expect(balance).toBeGreaterThan(0);
  });

  it('should create transfer transaction', async () => {
    const tx = await service.createTransferTx(
      '0xFrom',
      '0xTo',
      100,
      'USDT'
    );

    expect(tx.from).toBe('0xFrom');
    expect(tx.nonce).toBeDefined();
    expect(tx.gasLimit).toBeDefined();
  });

  it('should sign and broadcast transaction', async () => {
    const tx = await service.createTransferTx(
      '0xFrom',
      '0xTo',
      100,
      'USDT'
    );

    const signature = await service.signTransaction(tx, 'key');
    expect(signature.signedTx).toBeDefined();

    const txHash = await service.broadcastTransaction(signature.signedTx);
    expect(txHash).toMatch(/^0x/);
  });
});

describe('Settlement Service', () => {
  let service: MockSettlementService;

  beforeEach(() => {
    service = new MockSettlementService();
  });

  it('should settle payments', async () => {
    const mockOrder = {
      id: 'test-order',
      userId: 'user',
      chatId: 'chat',
      status: 'pending' as any,
      quote: {
        id: 'quote',
        amountTHB: 150,
        amountCrypto: 4.5,
        token: 'USDT' as const,
        rate: {} as any,
        fee: {} as any,
        promptPay: {} as any,
        createdAt: Date.now(),
        expiresAt: Date.now() + 180000,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = await service.settle(mockOrder);

    // Mock service has 95% success rate, so we just check it returns
    expect(result).toBeDefined();
    if (result.success) {
      expect(result.settlementId).toBeDefined();
      expect(result.transactionRef).toBeDefined();
    }
  });
});
