/**
 * Get Crypto Quote Tool
 * AI Tool for getting exchange rates and creating payment quotes
 */

import type {
  GetQuoteParams,
  GetQuoteResult,
  PaymentQuote,
  SupportedToken,
  PromptPayData,
  BoonLinkConfig,
} from '../types/index.js';
import {
  createExchangeService,
  formatRate,
  formatCryptoAmount,
  type IExchangeService,
} from '../services/exchange.js';

// Default config for standalone use
const DEFAULT_CONFIG: BoonLinkConfig = {
  demoMode: true,
  defaultToken: 'USDT',
  maxAmountTHB: 10000,
  offlineQueueEnabled: true,
};

let exchangeService: IExchangeService | null = null;

/**
 * Tool definition for OpenClaw
 */
export const getQuoteToolDefinition = {
  name: 'get_crypto_quote',
  description: `Get a real-time exchange rate quote for converting cryptocurrency to Thai Baht.
Returns the amount of crypto needed to pay a specific THB amount, including fees.
Quotes are valid for 3 minutes.

Supported tokens: USDT, USDC, ETH`,
  parameters: {
    type: 'object' as const,
    properties: {
      amountTHB: {
        type: 'number',
        description: 'Amount in Thai Baht to pay',
      },
      token: {
        type: 'string',
        enum: ['USDT', 'USDC', 'ETH'],
        description: 'Cryptocurrency to use for payment',
      },
      promptPay: {
        type: 'object',
        description: 'PromptPay account data from QR scan',
        properties: {
          accountId: { type: 'string' },
          accountType: { type: 'string' },
          merchantName: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          country: { type: 'string' },
        },
        required: ['accountId', 'accountType'],
      },
    },
    required: ['amountTHB', 'token', 'promptPay'],
  },
};

/**
 * Initialize exchange service
 */
export function initExchangeService(config: BoonLinkConfig = DEFAULT_CONFIG): void {
  exchangeService = createExchangeService(config);
}

/**
 * Get or create exchange service
 */
function getExchangeService(): IExchangeService {
  if (!exchangeService) {
    exchangeService = createExchangeService(DEFAULT_CONFIG);
  }
  return exchangeService;
}

/**
 * Validate quote parameters
 */
function validateQuoteParams(params: GetQuoteParams): string | null {
  const { amountTHB, token, promptPay } = params;

  if (!amountTHB || amountTHB <= 0) {
    return 'Amount must be greater than 0';
  }

  if (amountTHB > DEFAULT_CONFIG.maxAmountTHB) {
    return `Amount exceeds maximum limit of ฿${DEFAULT_CONFIG.maxAmountTHB.toLocaleString()}`;
  }

  if (!['USDT', 'USDC', 'ETH'].includes(token)) {
    return `Unsupported token: ${token}. Supported: USDT, USDC, ETH`;
  }

  if (!promptPay || !promptPay.accountId) {
    return 'PromptPay account information is required';
  }

  return null;
}

/**
 * Main handler for get_crypto_quote tool
 */
export async function getCryptoQuote(params: GetQuoteParams): Promise<GetQuoteResult> {
  try {
    // Validate parameters
    const validationError = validateQuoteParams(params);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    const { amountTHB, token, promptPay } = params;
    const service = getExchangeService();

    // Create quote
    const quote = await service.createQuote(amountTHB, token, promptPay);

    return {
      success: true,
      quote,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get rates for all supported tokens
 */
export async function getAllRates(): Promise<
  Record<SupportedToken, { rate: number; formatted: string }>
> {
  const service = getExchangeService();
  const tokens: SupportedToken[] = ['USDT', 'USDC', 'ETH'];

  const rates: Record<SupportedToken, { rate: number; formatted: string }> = {} as any;

  for (const token of tokens) {
    const rate = await service.getRate(token);
    rates[token] = {
      rate: rate.rate,
      formatted: formatRate(rate),
    };
  }

  return rates;
}

/**
 * Format quote for display in chat
 */
export function formatQuoteForChat(quote: PaymentQuote): string {
  const expiresIn = Math.max(0, Math.floor((quote.expiresAt - Date.now()) / 1000));

  let message = `💱 **Payment Quote**\n\n`;
  message += `🏪 **To:** ${quote.promptPay.merchantName || formatAccountId(quote.promptPay)}\n`;
  message += `💵 **Amount:** ฿${quote.amountTHB.toLocaleString('th-TH', { minimumFractionDigits: 2 })}\n\n`;

  message += `📊 **Exchange Rate**\n`;
  message += `${formatRate(quote.rate)}\n`;
  message += `Source: ${quote.rate.source}\n\n`;

  message += `💳 **You Pay**\n`;
  message += `${formatCryptoAmount(quote.amountCrypto, quote.token)}\n`;

  message += `\n📝 **Fees**\n`;
  message += `Network: ${formatCryptoAmount(quote.fee.network, quote.token)}\n`;
  message += `Service: ${formatCryptoAmount(quote.fee.service, quote.token)}\n`;

  message += `\n⏱️ **Valid for:** ${expiresIn} seconds\n`;
  message += `🆔 **Quote ID:** ${quote.id.slice(0, 8)}`;

  return message;
}

/**
 * Format account ID for display
 */
function formatAccountId(promptPay: PromptPayData): string {
  if (promptPay.accountType === 'phone') {
    const phone = promptPay.accountId;
    return `${phone.slice(0, 3)}-xxx-${phone.slice(-4)}`;
  }
  return `ID: ****${promptPay.accountId.slice(-4)}`;
}

/**
 * Check if quote is still valid
 */
export function isQuoteValid(quote: PaymentQuote): boolean {
  return Date.now() < quote.expiresAt;
}

/**
 * Calculate time remaining for quote
 */
export function getQuoteTimeRemaining(quote: PaymentQuote): number {
  return Math.max(0, quote.expiresAt - Date.now());
}
