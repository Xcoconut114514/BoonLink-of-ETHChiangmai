/**
 * A2UI Card Builders
 * Creates visual UI cards for the payment flow
 */

import type {
  A2UICard,
  A2UIComponent,
  PaymentQuote,
  PaymentOrder,
  PaymentStatus,
  SupportedToken,
  PromptPayData,
  OfflineQueueStats,
  NetworkStatus,
} from '../types/index.js';
import { formatRate, formatCryptoAmount } from '../services/exchange.js';
import { shortenTxHash, getExplorerUrl } from '../services/blockchain.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Token icons
 */
const TOKEN_ICONS: Record<SupportedToken, string> = {
  USDT: '💵',
  USDC: '🔵',
  ETH: '💎',
};

/**
 * Create checkout card after QR scan
 */
export function createCheckoutCard(
  promptPay: PromptPayData,
  quote: PaymentQuote
): A2UICard {
  const expiresInSeconds = Math.max(
    0,
    Math.floor((quote.expiresAt - Date.now()) / 1000)
  );

  return {
    type: 'card',
    id: `checkout_${quote.id}`,
    title: 'BoonLink Payment',
    content: [
      {
        type: 'header',
        icon: '💳',
        title: promptPay.merchantName || 'PromptPay Payment',
        subtitle: formatPromptPayId(promptPay),
      },
      { type: 'divider' },
      {
        type: 'info_row',
        label: 'Amount',
        value: `฿${quote.amountTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
      },
      {
        type: 'info_row',
        label: 'Exchange Rate',
        value: formatRate(quote.rate),
      },
      {
        type: 'info_row',
        label: 'Network Fee',
        value: formatCryptoAmount(quote.fee.network, quote.token),
      },
      {
        type: 'info_row',
        label: 'You Pay',
        value: formatCryptoAmount(quote.amountCrypto, quote.token),
        highlight: true,
      },
      { type: 'divider' },
      {
        type: 'token_selector',
        options: ['USDT', 'USDC', 'ETH'],
        selected: quote.token,
      },
      {
        type: 'progress',
        steps: [
          { label: 'Scan QR', completed: true },
          { label: 'Quote', completed: true },
          { label: 'Pay', completed: false },
          { label: 'Done', completed: false },
        ],
        current: 2,
      },
      {
        type: 'actions',
        buttons: [
          {
            label: `Pay ${formatCryptoAmount(quote.amountCrypto, quote.token)}`,
            action: `confirm_payment:${quote.id}`,
            style: 'primary',
          },
          {
            label: 'Cancel',
            action: 'cancel_payment',
            style: 'secondary',
          },
        ],
      },
      {
        type: 'info_row',
        label: 'Quote expires in',
        value: `${expiresInSeconds}s`,
      },
    ],
  };
}

/**
 * Create processing card during payment
 */
export function createProcessingCard(order: PaymentOrder): A2UICard {
  const statusSteps = getStatusSteps(order.status);

  return {
    type: 'card',
    id: `processing_${order.id}`,
    title: 'Processing Payment',
    content: [
      {
        type: 'status',
        icon: '⏳',
        text: getStatusText(order.status),
        color: 'info',
      },
      { type: 'divider' },
      {
        type: 'progress',
        steps: statusSteps,
        current: getCurrentStep(order.status),
      },
      {
        type: 'info_row',
        label: 'Amount',
        value: `฿${order.quote.amountTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
      },
      {
        type: 'info_row',
        label: 'Paying',
        value: formatCryptoAmount(order.quote.amountCrypto, order.quote.token),
      },
      ...(order.txHash
        ? [
            {
              type: 'info_row' as const,
              label: 'Transaction',
              value: shortenTxHash(order.txHash),
            },
          ]
        : []),
    ],
  };
}

/**
 * Create success receipt card
 */
export function createReceiptCard(order: PaymentOrder): A2UICard {
  const completedDate = new Date(order.completedAt || Date.now());

  return {
    type: 'card',
    id: `receipt_${order.id}`,
    title: 'Payment Receipt',
    content: [
      {
        type: 'status',
        icon: '✅',
        text: 'Payment Successful',
        color: 'success',
      },
      { type: 'divider' },
      {
        type: 'receipt',
        merchant:
          order.quote.promptPay.merchantName ||
          formatPromptPayId(order.quote.promptPay),
        amountTHB: `฿${order.quote.amountTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`,
        amountCrypto: formatCryptoAmount(
          order.quote.amountCrypto,
          order.quote.token
        ),
        txHash: order.txHash,
        timestamp: completedDate.toLocaleString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      { type: 'divider' },
      {
        type: 'info_row',
        label: 'Order ID',
        value: order.id.slice(0, 8).toUpperCase(),
      },
      {
        type: 'info_row',
        label: 'Settlement Ref',
        value: order.settlementId?.slice(0, 8).toUpperCase() || 'N/A',
      },
      ...(order.txHash
        ? [
            {
              type: 'qr_code' as const,
              data: getExplorerUrl(order.txHash),
              size: 120,
            },
          ]
        : []),
      {
        type: 'actions',
        buttons: [
          {
            label: 'View on BSCScan',
            action: `open_url:${order.txHash ? getExplorerUrl(order.txHash) : ''}`,
            style: 'secondary',
            disabled: !order.txHash,
          },
          {
            label: 'New Payment',
            action: 'new_payment',
            style: 'primary',
          },
        ],
      },
    ],
  };
}

/**
 * Create error card
 */
export function createErrorCard(
  error: string,
  orderId?: string
): A2UICard {
  return {
    type: 'card',
    id: `error_${orderId || uuidv4()}`,
    title: 'Payment Failed',
    content: [
      {
        type: 'status',
        icon: '❌',
        text: 'Payment Failed',
        color: 'error',
      },
      { type: 'divider' },
      {
        type: 'info_row',
        label: 'Error',
        value: error,
      },
      {
        type: 'actions',
        buttons: [
          {
            label: 'Try Again',
            action: 'retry_payment',
            style: 'primary',
          },
          {
            label: 'Cancel',
            action: 'cancel_payment',
            style: 'secondary',
          },
        ],
      },
    ],
  };
}

/**
 * Create offline queue status card
 */
export function createOfflineStatusCard(
  stats: OfflineQueueStats,
  networkStatus: NetworkStatus
): A2UICard {
  const networkIcon =
    networkStatus === NetworkStatus.ONLINE
      ? '🟢'
      : networkStatus === NetworkStatus.WEAK
        ? '🟡'
        : '🔴';

  const networkText =
    networkStatus === NetworkStatus.ONLINE
      ? 'Online'
      : networkStatus === NetworkStatus.WEAK
        ? 'Weak Signal'
        : 'Offline';

  return {
    type: 'card',
    id: 'offline_status',
    title: 'Sync Status',
    content: [
      {
        type: 'header',
        icon: networkIcon,
        title: networkText,
        subtitle: `${stats.pending} pending transactions`,
      },
      { type: 'divider' },
      {
        type: 'info_row',
        label: 'Pending',
        value: stats.pending.toString(),
      },
      {
        type: 'info_row',
        label: 'Processing',
        value: stats.processing.toString(),
      },
      {
        type: 'info_row',
        label: 'Failed',
        value: stats.failed.toString(),
        highlight: stats.failed > 0,
      },
      ...(stats.oldestItem
        ? [
            {
              type: 'info_row' as const,
              label: 'Oldest',
              value: formatTimeAgo(stats.oldestItem),
            },
          ]
        : []),
      {
        type: 'actions',
        buttons: [
          {
            label: 'Force Sync',
            action: 'force_sync',
            style: 'primary',
            disabled: networkStatus === NetworkStatus.OFFLINE,
          },
        ],
      },
    ],
  };
}

/**
 * Create QR scan prompt card
 */
export function createScanPromptCard(): A2UICard {
  return {
    type: 'card',
    id: 'scan_prompt',
    title: 'BoonLink Pay',
    content: [
      {
        type: 'header',
        icon: '📸',
        title: 'Scan PromptPay QR',
        subtitle: 'Send a QR code image to pay with crypto',
      },
      { type: 'divider' },
      {
        type: 'info_row',
        label: 'Supported',
        value: 'USDT, USDC, ETH',
      },
      {
        type: 'info_row',
        label: 'Network',
        value: 'BSC (Low fees)',
      },
      {
        type: 'info_row',
        label: 'Settlement',
        value: 'Instant to PromptPay',
      },
      {
        type: 'actions',
        buttons: [
          {
            label: 'Check Rates',
            action: 'check_rates',
            style: 'secondary',
          },
        ],
      },
    ],
  };
}

/**
 * Create rates display card
 */
export function createRatesCard(
  rates: Record<SupportedToken, { rate: number; formatted: string }>
): A2UICard {
  return {
    type: 'card',
    id: 'rates',
    title: 'Exchange Rates',
    content: [
      {
        type: 'header',
        icon: '📊',
        title: 'Current Rates',
        subtitle: 'Crypto to THB',
      },
      { type: 'divider' },
      {
        type: 'info_row',
        label: `${TOKEN_ICONS.USDT} USDT`,
        value: `฿${rates.USDT.rate.toFixed(2)}`,
      },
      {
        type: 'info_row',
        label: `${TOKEN_ICONS.USDC} USDC`,
        value: `฿${rates.USDC.rate.toFixed(2)}`,
      },
      {
        type: 'info_row',
        label: `${TOKEN_ICONS.ETH} ETH`,
        value: `฿${rates.ETH.rate.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`,
      },
      {
        type: 'info_row',
        label: 'Updated',
        value: new Date().toLocaleTimeString('th-TH'),
      },
    ],
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatPromptPayId(promptPay: PromptPayData): string {
  if (promptPay.accountType === 'phone') {
    const phone = promptPay.accountId;
    return `${phone.slice(0, 3)}-xxx-${phone.slice(-4)}`;
  }
  return `ID: ****${promptPay.accountId.slice(-4)}`;
}

function getStatusText(status: PaymentStatus): string {
  const texts: Record<PaymentStatus, string> = {
    [PaymentStatus.INIT]: 'Initializing...',
    [PaymentStatus.QUOTED]: 'Quote ready',
    [PaymentStatus.SIGNED]: 'Transaction signed',
    [PaymentStatus.PENDING]: 'Broadcasting transaction...',
    [PaymentStatus.SETTLED]: 'Settling to PromptPay...',
    [PaymentStatus.COMPLETED]: 'Payment complete!',
    [PaymentStatus.EXPIRED]: 'Quote expired',
    [PaymentStatus.CANCELLED]: 'Payment cancelled',
    [PaymentStatus.FAILED]: 'Payment failed',
    [PaymentStatus.TIMEOUT]: 'Transaction timeout',
  };
  return texts[status] || 'Unknown status';
}

function getStatusSteps(
  status: PaymentStatus
): { label: string; completed: boolean }[] {
  const currentStep = getCurrentStep(status);
  return [
    { label: 'Scan QR', completed: currentStep >= 0 },
    { label: 'Quote', completed: currentStep >= 1 },
    { label: 'Sign', completed: currentStep >= 2 },
    { label: 'Confirm', completed: currentStep >= 3 },
    { label: 'Settle', completed: currentStep >= 4 },
  ];
}

function getCurrentStep(status: PaymentStatus): number {
  const steps: Record<PaymentStatus, number> = {
    [PaymentStatus.INIT]: 0,
    [PaymentStatus.QUOTED]: 1,
    [PaymentStatus.SIGNED]: 2,
    [PaymentStatus.PENDING]: 3,
    [PaymentStatus.SETTLED]: 4,
    [PaymentStatus.COMPLETED]: 5,
    [PaymentStatus.EXPIRED]: 1,
    [PaymentStatus.CANCELLED]: 0,
    [PaymentStatus.FAILED]: 3,
    [PaymentStatus.TIMEOUT]: 3,
  };
  return steps[status] || 0;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Convert A2UI card to JSON string for sending
 */
export function cardToJson(card: A2UICard): string {
  return JSON.stringify(card, null, 2);
}

/**
 * Create a minimal text fallback for non-A2UI clients
 */
export function cardToTextFallback(card: A2UICard): string {
  let text = `**${card.title}**\n\n`;

  for (const component of card.content) {
    if (component.type === 'header') {
      text += `${component.icon || ''} ${component.title}\n`;
      if (component.subtitle) text += `${component.subtitle}\n`;
    } else if (component.type === 'info_row') {
      text += `${component.label}: ${component.value}\n`;
    } else if (component.type === 'status') {
      text += `${component.icon} ${component.text}\n`;
    } else if (component.type === 'divider') {
      text += `---\n`;
    }
  }

  return text;
}
