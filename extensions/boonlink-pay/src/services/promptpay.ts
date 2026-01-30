/**
 * PromptPay QR Code Parser
 * Implements EMVCo QR Code specification for Thai PromptPay
 *
 * Reference: https://www.bot.or.th/Thai/PaymentSystems/StandardPS/Documents/ThaiQRCode_Specs.pdf
 */

import { crc16ccitt } from 'crc';
import type { PromptPayData, PromptPayQRResult } from '../types/index.js';

// EMVCo Tag IDs
const TAG = {
  PAYLOAD_FORMAT: '00',
  POI_METHOD: '01',
  MERCHANT_ACCOUNT_INFO: '29', // PromptPay specific
  MERCHANT_ACCOUNT_INFO_ALT: '30',
  TRANSACTION_CURRENCY: '53',
  TRANSACTION_AMOUNT: '54',
  COUNTRY_CODE: '58',
  MERCHANT_NAME: '59',
  MERCHANT_CITY: '60',
  CRC: '63',
} as const;

// PromptPay Application ID
const PROMPTPAY_AID = 'A000000677010111';

/**
 * Parse TLV (Tag-Length-Value) data from EMVCo QR
 */
function parseTLV(data: string): Map<string, string> {
  const result = new Map<string, string>();
  let position = 0;

  while (position < data.length) {
    // Tag: 2 characters
    const tag = data.substring(position, position + 2);
    position += 2;

    // Length: 2 characters
    const length = parseInt(data.substring(position, position + 2), 10);
    position += 2;

    // Value: `length` characters
    const value = data.substring(position, position + length);
    position += length;

    result.set(tag, value);
  }

  return result;
}

/**
 * Validate CRC16 checksum
 */
function validateCRC(payload: string): boolean {
  // CRC is calculated over all data except the CRC value itself
  // Format: ...6304XXXX where XXXX is the CRC
  const dataWithoutCRC = payload.slice(0, -4);
  const providedCRC = payload.slice(-4).toUpperCase();

  // Calculate CRC16-CCITT
  const calculated = crc16ccitt(Buffer.from(dataWithoutCRC, 'utf8'))
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');

  return calculated === providedCRC;
}

/**
 * Extract PromptPay account from merchant account info
 */
function extractPromptPayAccount(
  merchantInfo: string
): { accountId: string; accountType: 'phone' | 'national_id' } | null {
  const fields = parseTLV(merchantInfo);

  // Check if this is a PromptPay QR
  const aid = fields.get('00');
  if (aid !== PROMPTPAY_AID) {
    return null;
  }

  // Account ID is in tag 01 or 02
  // 01 = phone number, 02 = national ID, 03 = e-wallet
  const phoneOrId = fields.get('01') || fields.get('02');
  if (!phoneOrId) {
    return null;
  }

  // Format: 00TH followed by phone (10 digits) or ID (13 digits)
  // Or: 0066XXXXXXXXX for phone with country code
  let accountId = phoneOrId;
  let accountType: 'phone' | 'national_id' = 'phone';

  if (phoneOrId.startsWith('00')) {
    // Remove country prefix
    accountId = phoneOrId.substring(4);
  }

  // Determine type by length
  if (accountId.length === 13) {
    accountType = 'national_id';
  } else if (accountId.length === 10 || accountId.length === 9) {
    accountType = 'phone';
    // Normalize phone number
    if (accountId.length === 9) {
      accountId = '0' + accountId;
    }
  }

  return { accountId, accountType };
}

/**
 * Format phone number for display
 */
function formatPhoneNumber(phone: string): string {
  if (phone.length === 10) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  }
  return phone;
}

/**
 * Parse PromptPay QR code payload
 */
export function parsePromptPayQR(payload: string): PromptPayQRResult {
  try {
    // Remove any whitespace
    const cleanPayload = payload.trim().replace(/\s/g, '');

    // Validate minimum length
    if (cleanPayload.length < 20) {
      return {
        success: false,
        error: 'Invalid QR payload: too short',
      };
    }

    // Validate CRC
    const isValidCRC = validateCRC(cleanPayload);

    // Parse TLV structure
    const fields = parseTLV(cleanPayload);

    // Check payload format
    const payloadFormat = fields.get(TAG.PAYLOAD_FORMAT);
    if (payloadFormat !== '01') {
      return {
        success: false,
        error: `Unsupported payload format: ${payloadFormat}`,
      };
    }

    // Get merchant account info (PromptPay data)
    const merchantInfo =
      fields.get(TAG.MERCHANT_ACCOUNT_INFO) ||
      fields.get(TAG.MERCHANT_ACCOUNT_INFO_ALT);

    if (!merchantInfo) {
      return {
        success: false,
        error: 'No PromptPay account information found',
      };
    }

    // Extract PromptPay account
    const account = extractPromptPayAccount(merchantInfo);
    if (!account) {
      return {
        success: false,
        error: 'Invalid PromptPay account format',
      };
    }

    // Get amount if present
    const amountStr = fields.get(TAG.TRANSACTION_AMOUNT);
    const amount = amountStr ? parseFloat(amountStr) : undefined;

    // Get currency (should be 764 for THB)
    const currency = fields.get(TAG.TRANSACTION_CURRENCY) || '764';

    // Get country code
    const country = fields.get(TAG.COUNTRY_CODE) || 'TH';

    // Get merchant name if available
    const merchantName = fields.get(TAG.MERCHANT_NAME);

    const result: PromptPayData = {
      accountId: account.accountId,
      accountType: account.accountType,
      merchantName,
      amount,
      currency,
      country,
      rawPayload: cleanPayload,
      isValid: isValidCRC,
    };

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse QR: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate PromptPay QR code payload
 * Useful for testing and merchant-side generation
 */
export function generatePromptPayPayload(
  accountId: string,
  amount?: number
): string {
  // Determine account type
  const isPhone = accountId.length <= 10;
  const formattedId = isPhone
    ? '0066' + (accountId.startsWith('0') ? accountId.slice(1) : accountId)
    : '00TH' + accountId;

  // Build merchant account info
  const aidField = `00${PROMPTPAY_AID.length.toString().padStart(2, '0')}${PROMPTPAY_AID}`;
  const idField = `01${formattedId.length.toString().padStart(2, '0')}${formattedId}`;
  const merchantInfo = aidField + idField;
  const merchantInfoField = `${TAG.MERCHANT_ACCOUNT_INFO}${merchantInfo.length.toString().padStart(2, '0')}${merchantInfo}`;

  // Build payload
  let payload = '';

  // Payload format indicator
  payload += '000201';

  // POI method (11 = static, 12 = dynamic)
  payload += amount ? '010212' : '010211';

  // Merchant account info
  payload += merchantInfoField;

  // Currency (THB = 764)
  payload += '5303764';

  // Amount (if specified)
  if (amount) {
    const amountStr = amount.toFixed(2);
    payload += `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
  }

  // Country code
  payload += '5802TH';

  // CRC placeholder
  payload += '6304';

  // Calculate and append CRC
  const crc = crc16ccitt(Buffer.from(payload, 'utf8'))
    .toString(16)
    .toUpperCase()
    .padStart(4, '0');

  return payload + crc;
}

/**
 * Format PromptPay data for display
 */
export function formatPromptPayDisplay(data: PromptPayData): {
  displayId: string;
  displayType: string;
  displayAmount: string;
} {
  const displayId =
    data.accountType === 'phone'
      ? formatPhoneNumber(data.accountId)
      : `ID: ${data.accountId.slice(0, 4)}****${data.accountId.slice(-4)}`;

  const displayType =
    data.accountType === 'phone' ? 'Phone Number' : 'National ID';

  const displayAmount = data.amount
    ? `฿${data.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
    : 'Amount not specified';

  return { displayId, displayType, displayAmount };
}
