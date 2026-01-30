/**
 * Confirm Payment Tool
 * AI Tool for executing crypto payments
 */

import type {
  ConfirmPaymentParams,
  ConfirmPaymentResult,
  PaymentOrder,
  PaymentQuote,
  PaymentStatus,
  BoonLinkConfig,
  NetworkStatus,
} from '../types/index.js';
import {
  createBlockchainService,
  shortenTxHash,
  getExplorerUrl,
  type IBlockchainService,
} from '../services/blockchain.js';
import { createSettlementService, type ISettlementService } from '../services/settlement.js';
import { v4 as uuidv4 } from 'uuid';

// Default config
const DEFAULT_CONFIG: BoonLinkConfig = {
  demoMode: true,
  defaultToken: 'USDT',
  maxAmountTHB: 10000,
  offlineQueueEnabled: true,
};

// In-memory order storage (replace with SQLite in production)
const orderStore = new Map<string, PaymentOrder>();
const quoteStore = new Map<string, PaymentQuote>();

let blockchainService: IBlockchainService | null = null;
let settlementService: ISettlementService | null = null;

/**
 * Tool definition for OpenClaw
 */
export const confirmPaymentToolDefinition = {
  name: 'confirm_payment',
  description: `Execute a cryptocurrency payment using a previously created quote.
This will:
1. Verify the quote is still valid
2. Process the crypto transaction
3. Settle THB to the merchant's PromptPay account
4. Return a payment receipt

Requires wallet signature (via WalletConnect or pre-signed transaction).`,
  parameters: {
    type: 'object' as const,
    properties: {
      quoteId: {
        type: 'string',
        description: 'The quote ID from get_crypto_quote',
      },
      walletAddress: {
        type: 'string',
        description: 'The sender wallet address',
      },
      userId: {
        type: 'string',
        description: 'User ID for order tracking',
      },
      chatId: {
        type: 'string',
        description: 'Chat ID for notifications',
      },
    },
    required: ['quoteId', 'walletAddress', 'userId', 'chatId'],
  },
};

/**
 * Initialize services
 */
export function initPaymentServices(config: BoonLinkConfig = DEFAULT_CONFIG): void {
  blockchainService = createBlockchainService(config);
  settlementService = createSettlementService(config);
}

/**
 * Get or create services
 */
function getServices(): {
  blockchain: IBlockchainService;
  settlement: ISettlementService;
} {
  if (!blockchainService) {
    blockchainService = createBlockchainService(DEFAULT_CONFIG);
  }
  if (!settlementService) {
    settlementService = createSettlementService(DEFAULT_CONFIG);
  }
  return {
    blockchain: blockchainService,
    settlement: settlementService,
  };
}

/**
 * Store a quote for later confirmation
 */
export function storeQuote(quote: PaymentQuote): void {
  quoteStore.set(quote.id, quote);
}

/**
 * Get a stored quote
 */
export function getQuote(quoteId: string): PaymentQuote | undefined {
  return quoteStore.get(quoteId);
}

/**
 * Create a new payment order
 */
function createOrder(
  quote: PaymentQuote,
  userId: string,
  chatId: string
): PaymentOrder {
  const now = Date.now();
  const order: PaymentOrder = {
    id: uuidv4(),
    userId,
    chatId,
    status: PaymentStatus.QUOTED,
    quote,
    createdAt: now,
    updatedAt: now,
  };

  orderStore.set(order.id, order);
  return order;
}

/**
 * Update order status
 */
function updateOrder(order: PaymentOrder): void {
  order.updatedAt = Date.now();
  orderStore.set(order.id, order);
}

/**
 * Main handler for confirm_payment tool
 */
export async function confirmPayment(
  params: ConfirmPaymentParams & {
    quoteId: string;
    userId: string;
    chatId: string;
  }
): Promise<ConfirmPaymentResult> {
  const { quoteId, walletAddress, userId, chatId } = params;

  try {
    // Get the quote
    const quote = quoteStore.get(quoteId);
    if (!quote) {
      return {
        success: false,
        error: 'Quote not found. Please scan the QR code again.',
      };
    }

    // Check if quote is still valid
    if (Date.now() > quote.expiresAt) {
      return {
        success: false,
        error: 'Quote has expired. Please get a new quote.',
      };
    }

    // Create order
    const order = createOrder(quote, userId, chatId);
    const services = getServices();

    // Check wallet balance (in demo mode, this always succeeds)
    const balance = await services.blockchain.getBalance(walletAddress, quote.token);
    if (balance < quote.amountCrypto) {
      order.status = PaymentStatus.FAILED;
      order.error = `Insufficient balance. Required: ${quote.amountCrypto} ${quote.token}, Available: ${balance} ${quote.token}`;
      updateOrder(order);

      return {
        success: false,
        order,
        error: order.error,
      };
    }

    // Create and sign transaction
    order.status = PaymentStatus.SIGNED;
    updateOrder(order);

    // In demo mode, we simulate the entire flow
    // In production, this would involve WalletConnect signing

    const tx = await services.blockchain.createTransferTx(
      walletAddress,
      DEFAULT_CONFIG.collectionAddress || '0xBoonLinkCollection',
      quote.amountCrypto,
      quote.token
    );

    // Mock sign (in production, user signs via WalletConnect)
    const signature = await services.blockchain.signTransaction(tx, 'demo_key');
    order.signature = signature;
    updateOrder(order);

    // Broadcast transaction
    order.status = PaymentStatus.PENDING;
    updateOrder(order);

    const txHash = await services.blockchain.broadcastTransaction(signature.signedTx);
    order.txHash = txHash;
    updateOrder(order);

    // Wait for confirmation
    const confirmed = await services.blockchain.waitForConfirmation(txHash);
    if (!confirmed) {
      order.status = PaymentStatus.FAILED;
      order.error = 'Transaction failed to confirm';
      updateOrder(order);

      return {
        success: false,
        order,
        txHash,
        error: order.error,
      };
    }

    // Settle to PromptPay
    order.status = PaymentStatus.SETTLED;
    updateOrder(order);

    const settlement = await services.settlement.settle(order);
    if (!settlement.success) {
      order.status = PaymentStatus.FAILED;
      order.error = settlement.error || 'Settlement failed';
      updateOrder(order);

      return {
        success: false,
        order,
        txHash,
        error: order.error,
      };
    }

    // Complete!
    order.status = PaymentStatus.COMPLETED;
    order.settlementId = settlement.settlementId;
    order.completedAt = Date.now();
    updateOrder(order);

    // Clean up quote
    quoteStore.delete(quoteId);

    return {
      success: true,
      order,
      txHash,
    };
  } catch (error) {
    return {
      success: false,
      error: `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get order by ID
 */
export function getOrder(orderId: string): PaymentOrder | undefined {
  return orderStore.get(orderId);
}

/**
 * Get orders by user
 */
export function getUserOrders(userId: string): PaymentOrder[] {
  const orders: PaymentOrder[] = [];
  for (const order of orderStore.values()) {
    if (order.userId === userId) {
      orders.push(order);
    }
  }
  return orders.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Format payment result for chat
 */
export function formatPaymentResultForChat(result: ConfirmPaymentResult): string {
  if (!result.success) {
    return `❌ **Payment Failed**\n\n${result.error}`;
  }

  const order = result.order!;
  const quote = order.quote;

  let message = `✅ **Payment Successful!**\n\n`;
  message += `🏪 **Paid to:** ${quote.promptPay.merchantName || 'PromptPay'}\n`;
  message += `💵 **Amount:** ฿${quote.amountTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n`;
  message += `💳 **Spent:** ${quote.amountCrypto.toFixed(quote.token === 'ETH' ? 6 : 2)} ${quote.token}\n\n`;

  if (result.txHash) {
    message += `🔗 **TX:** ${shortenTxHash(result.txHash)}\n`;
    message += `[View on BSCScan](${getExplorerUrl(result.txHash)})\n\n`;
  }

  message += `🆔 **Order ID:** ${order.id.slice(0, 8)}\n`;
  message += `⏱️ **Time:** ${new Date(order.completedAt!).toLocaleString('th-TH')}`;

  return message;
}

/**
 * Check payment status tool handler
 */
export async function checkPaymentStatus(params: {
  orderId: string;
}): Promise<{ success: boolean; order?: PaymentOrder; error?: string }> {
  const order = orderStore.get(params.orderId);

  if (!order) {
    return {
      success: false,
      error: 'Order not found',
    };
  }

  return {
    success: true,
    order,
  };
}
