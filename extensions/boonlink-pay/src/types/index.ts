/**
 * BoonLink Payment Types
 * Core type definitions for the payment system
 */

// ============================================================================
// Payment States
// ============================================================================

export enum PaymentStatus {
  INIT = 'init',
  QUOTED = 'quoted',
  SIGNED = 'signed',
  PENDING = 'pending',
  SETTLED = 'settled',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

export enum NetworkStatus {
  ONLINE = 'online',
  WEAK = 'weak',
  OFFLINE = 'offline',
  SYNCING = 'syncing',
}

// ============================================================================
// Crypto & Tokens
// ============================================================================

export type SupportedToken = 'USDT' | 'USDC' | 'ETH';

export interface TokenConfig {
  symbol: SupportedToken;
  name: string;
  network: string;
  contractAddress: string | null; // null for native tokens
  decimals: number;
  icon: string;
}

export const SUPPORTED_TOKENS: Record<SupportedToken, TokenConfig> = {
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    network: 'bsc',
    contractAddress: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    icon: '💵',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    network: 'bsc',
    contractAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    decimals: 18,
    icon: '🔵',
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'bsc',
    contractAddress: null, // BNB on BSC, but we treat as ETH-like
    decimals: 18,
    icon: '💎',
  },
};

// ============================================================================
// PromptPay
// ============================================================================

export interface PromptPayData {
  /** Phone number or National ID */
  accountId: string;
  /** Account type: phone or national_id */
  accountType: 'phone' | 'national_id';
  /** Merchant name (if available) */
  merchantName?: string;
  /** Amount in THB (if specified in QR) */
  amount?: number;
  /** Currency code (usually 764 for THB) */
  currency: string;
  /** Country code */
  country: string;
  /** Raw QR payload */
  rawPayload: string;
  /** CRC checksum valid */
  isValid: boolean;
}

export interface PromptPayQRResult {
  success: boolean;
  data?: PromptPayData;
  error?: string;
}

// ============================================================================
// Exchange & Quotes
// ============================================================================

export interface ExchangeRate {
  token: SupportedToken;
  fiat: 'THB';
  rate: number;
  source: string;
  timestamp: number;
  validUntil: number;
}

export interface PaymentQuote {
  id: string;
  amountTHB: number;
  amountCrypto: number;
  token: SupportedToken;
  rate: ExchangeRate;
  fee: {
    network: number;
    service: number;
    total: number;
  };
  promptPay: PromptPayData;
  createdAt: number;
  expiresAt: number;
}

// ============================================================================
// Orders & Transactions
// ============================================================================

export interface PaymentOrder {
  id: string;
  userId: string;
  chatId: string;
  status: PaymentStatus;
  quote: PaymentQuote;
  signature?: TransactionSignature;
  txHash?: string;
  settlementId?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
}

export interface TransactionSignature {
  /** Signed transaction data (hex) */
  signedTx: string;
  /** Sender wallet address */
  from: string;
  /** Recipient (our collection address) */
  to: string;
  /** Nonce */
  nonce: number;
  /** Gas limit */
  gasLimit: string;
  /** Gas price or max fee */
  gasPrice: string;
  /** Chain ID */
  chainId: number;
  /** Timestamp when signed */
  signedAt: number;
}

// ============================================================================
// Offline Queue
// ============================================================================

export interface OfflineQueueItem {
  id: string;
  order: PaymentOrder;
  signature: TransactionSignature;
  retryCount: number;
  lastRetry?: number;
  nextRetry?: number;
  createdAt: number;
}

export interface OfflineQueueStats {
  pending: number;
  processing: number;
  failed: number;
  totalAmount: number;
  oldestItem?: number;
}

// ============================================================================
// A2UI Card Types
// ============================================================================

export interface A2UICard {
  type: 'card';
  id: string;
  title: string;
  content: A2UIComponent[];
}

export type A2UIComponent =
  | A2UIHeader
  | A2UIDivider
  | A2UIInfoRow
  | A2UITokenSelector
  | A2UIActions
  | A2UIStatus
  | A2UIReceipt
  | A2UIQRCode
  | A2UIProgress;

export interface A2UIHeader {
  type: 'header';
  icon?: string;
  title: string;
  subtitle?: string;
}

export interface A2UIDivider {
  type: 'divider';
}

export interface A2UIInfoRow {
  type: 'info_row';
  label: string;
  value: string;
  highlight?: boolean;
}

export interface A2UITokenSelector {
  type: 'token_selector';
  options: SupportedToken[];
  selected: SupportedToken;
}

export interface A2UIActions {
  type: 'actions';
  buttons: A2UIButton[];
}

export interface A2UIButton {
  label: string;
  action: string;
  style: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export interface A2UIStatus {
  type: 'status';
  icon: string;
  text: string;
  color?: 'success' | 'warning' | 'error' | 'info';
}

export interface A2UIReceipt {
  type: 'receipt';
  merchant: string;
  amountTHB: string;
  amountCrypto: string;
  txHash?: string;
  timestamp: string;
}

export interface A2UIQRCode {
  type: 'qr_code';
  data: string;
  size?: number;
}

export interface A2UIProgress {
  type: 'progress';
  steps: { label: string; completed: boolean }[];
  current: number;
}

// ============================================================================
// Tool Parameters & Results
// ============================================================================

export interface ScanQRParams {
  imageUrl: string;
}

export interface ScanQRResult {
  success: boolean;
  promptPay?: PromptPayData;
  error?: string;
}

export interface GetQuoteParams {
  amountTHB: number;
  token: SupportedToken;
  promptPay: PromptPayData;
}

export interface GetQuoteResult {
  success: boolean;
  quote?: PaymentQuote;
  error?: string;
}

export interface ConfirmPaymentParams {
  orderId: string;
  walletAddress: string;
  signature?: string; // For offline pre-signed transactions
}

export interface ConfirmPaymentResult {
  success: boolean;
  order?: PaymentOrder;
  txHash?: string;
  error?: string;
}

export interface CheckStatusParams {
  orderId: string;
}

export interface CheckStatusResult {
  success: boolean;
  order?: PaymentOrder;
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface BoonLinkConfig {
  demoMode: boolean;
  defaultToken: SupportedToken;
  maxAmountTHB: number;
  offlineQueueEnabled: boolean;

  // Service endpoints (for non-demo mode)
  exchangeApiUrl?: string;
  settlementApiUrl?: string;
  rpcUrl?: string;

  // Collection wallet
  collectionAddress?: string;
}

// ============================================================================
// Events
// ============================================================================

export interface BoonLinkEvent {
  type: string;
  timestamp: number;
  data: unknown;
}

export interface PaymentStartedEvent extends BoonLinkEvent {
  type: 'payment_started';
  data: {
    orderId: string;
    userId: string;
    amountTHB: number;
  };
}

export interface PaymentCompletedEvent extends BoonLinkEvent {
  type: 'payment_completed';
  data: {
    orderId: string;
    txHash: string;
    amountTHB: number;
    amountCrypto: number;
    token: SupportedToken;
  };
}

export interface PaymentFailedEvent extends BoonLinkEvent {
  type: 'payment_failed';
  data: {
    orderId: string;
    error: string;
  };
}

export interface OfflineQueueSyncedEvent extends BoonLinkEvent {
  type: 'offline_queue_synced';
  data: {
    syncedCount: number;
    failedCount: number;
  };
}
