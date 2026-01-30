/**
 * BoonLink Payment Extension for OpenClaw
 *
 * Instant crypto-to-THB payment via PromptPay for merchants in Thailand.
 * Supports USDT, USDC, ETH on BSC network.
 *
 * Features:
 * - PromptPay QR code scanning and parsing
 * - Real-time exchange rate quotes
 * - Offline transaction signing and queue
 * - A2UI card-based UI
 */

// Types
export * from './types/index.js';

// Services
export {
  parsePromptPayQR,
  generatePromptPayPayload,
  formatPromptPayDisplay,
} from './services/promptpay.js';

export {
  createExchangeService,
  MockExchangeService,
  BitkubExchangeService,
  CoinGeckoExchangeService,
  formatRate,
  formatCryptoAmount,
  type IExchangeService,
} from './services/exchange.js';

export {
  createBlockchainService,
  BSCBlockchainService,
  MockBlockchainService,
  isValidAddress,
  shortenAddress,
  shortenTxHash,
  getExplorerUrl,
  type IBlockchainService,
} from './services/blockchain.js';

export {
  createSettlementService,
  MockSettlementService,
  PromptPaySettlementService,
  formatSettlementRef,
  generateReceiptData,
  type ISettlementService,
  type SettlementResult,
} from './services/settlement.js';

// Tools
export {
  scanPromptPayQR,
  mockScanPromptPayQR,
  scanQRToolDefinition,
  formatScanResultForChat,
} from './tools/scan-qr.js';

export {
  getCryptoQuote,
  getAllRates,
  getQuoteToolDefinition,
  formatQuoteForChat,
  isQuoteValid,
  getQuoteTimeRemaining,
  initExchangeService,
  storeQuote,
} from './tools/get-quote.js';

export {
  confirmPayment,
  checkPaymentStatus,
  confirmPaymentToolDefinition,
  formatPaymentResultForChat,
  initPaymentServices,
  getOrder,
  getUserOrders,
} from './tools/confirm-pay.js';

// Offline support
export { initDatabase, OrderStorage, QueueStorage } from './offline/storage.js';

export {
  OfflineQueueManager,
  createOfflineTransaction,
} from './offline/queue.js';

export {
  NetworkSyncManager,
  NetworkStatusDetector,
  type SyncEvent,
  type SyncEventListener,
} from './offline/sync.js';

// UI Cards
export {
  createCheckoutCard,
  createProcessingCard,
  createReceiptCard,
  createErrorCard,
  createOfflineStatusCard,
  createScanPromptCard,
  createRatesCard,
  cardToJson,
  cardToTextFallback,
} from './ui/cards.js';

// ============================================================================
// Plugin Registration
// ============================================================================

import type { BoonLinkConfig } from './types/index.js';
import { initExchangeService } from './tools/get-quote.js';
import { initPaymentServices } from './tools/confirm-pay.js';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: BoonLinkConfig = {
  demoMode: true,
  defaultToken: 'USDT',
  maxAmountTHB: 10000,
  offlineQueueEnabled: true,
};

/**
 * Initialize the BoonLink extension
 */
export function initBoonLink(config: Partial<BoonLinkConfig> = {}): void {
  const fullConfig: BoonLinkConfig = { ...DEFAULT_CONFIG, ...config };

  // Initialize services
  initExchangeService(fullConfig);
  initPaymentServices(fullConfig);

  console.log('[BoonLink] Extension initialized', {
    demoMode: fullConfig.demoMode,
    offlineQueue: fullConfig.offlineQueueEnabled,
  });
}

/**
 * Tool definitions for OpenClaw registration
 */
export const boonlinkTools = {
  scan_promptpay_qr: {
    ...scanQRToolDefinition,
    handler: scanPromptPayQR,
  },
  get_crypto_quote: {
    ...getQuoteToolDefinition,
    handler: getCryptoQuote,
  },
  confirm_payment: {
    ...confirmPaymentToolDefinition,
    handler: confirmPayment,
  },
  check_payment_status: {
    name: 'check_payment_status',
    description: 'Check the status of a payment order',
    parameters: {
      type: 'object' as const,
      properties: {
        orderId: {
          type: 'string',
          description: 'The order ID to check',
        },
      },
      required: ['orderId'],
    },
    handler: checkPaymentStatus,
  },
  get_exchange_rates: {
    name: 'get_exchange_rates',
    description: 'Get current exchange rates for all supported tokens',
    parameters: {
      type: 'object' as const,
      properties: {},
    },
    handler: getAllRates,
  },
};

/**
 * Extension metadata
 */
export const extensionInfo = {
  id: 'boonlink-pay',
  name: 'BoonLink Payment',
  version: '0.1.0',
  description: 'Instant crypto-to-THB payment via PromptPay',
  author: 'BoonLink Team',
  channels: ['telegram', 'discord', 'line'],
  tools: Object.keys(boonlinkTools),
};
