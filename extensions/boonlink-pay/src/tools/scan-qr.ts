/**
 * Scan PromptPay QR Tool
 * AI Tool for parsing PromptPay QR code images
 */

import jsQR from 'jsqr';
import type { ScanQRParams, ScanQRResult, PromptPayData } from '../types/index.js';
import { parsePromptPayQR, formatPromptPayDisplay } from '../services/promptpay.js';

/**
 * Tool definition for OpenClaw
 */
export const scanQRToolDefinition = {
  name: 'scan_promptpay_qr',
  description: `Scan and parse a PromptPay QR code image to extract payment information.
This tool accepts an image URL containing a Thai PromptPay QR code and returns:
- Merchant phone number or National ID
- Payment amount (if specified in QR)
- Merchant name (if available)

Use this when a user sends a QR code image for payment.`,
  parameters: {
    type: 'object' as const,
    properties: {
      imageUrl: {
        type: 'string',
        description: 'URL of the QR code image to scan',
      },
    },
    required: ['imageUrl'],
  },
};

/**
 * Fetch image and convert to ImageData
 */
async function fetchImageData(
  imageUrl: string
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  // In a real implementation, this would:
  // 1. Fetch the image from the URL
  // 2. Decode it using sharp or canvas
  // 3. Return the raw pixel data

  // For demo, we'll use a mock implementation
  // In production, integrate with OpenClaw's media-understanding module

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  // This is a simplified mock - in production use sharp or canvas
  const buffer = await response.arrayBuffer();

  // Mock image data for demo
  // In real implementation, decode the image properly
  return {
    data: new Uint8ClampedArray(buffer),
    width: 256,
    height: 256,
  };
}

/**
 * Decode QR code from image data
 */
function decodeQRCode(imageData: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}): string | null {
  const result = jsQR(imageData.data, imageData.width, imageData.height);
  return result?.data || null;
}

/**
 * Main handler for scan_promptpay_qr tool
 */
export async function scanPromptPayQR(params: ScanQRParams): Promise<ScanQRResult> {
  try {
    const { imageUrl } = params;

    // Validate URL
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return {
        success: false,
        error: 'Invalid image URL provided',
      };
    }

    // For demo mode, we can accept mock QR data directly
    if (imageUrl.startsWith('mock://')) {
      const mockPayload = imageUrl.replace('mock://', '');
      const result = parsePromptPayQR(mockPayload);

      if (result.success && result.data) {
        return {
          success: true,
          promptPay: result.data,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to parse mock QR',
      };
    }

    // Fetch and decode image
    const imageData = await fetchImageData(imageUrl);
    const qrData = decodeQRCode(imageData);

    if (!qrData) {
      return {
        success: false,
        error: 'No QR code found in image. Please ensure the image contains a valid PromptPay QR code.',
      };
    }

    // Parse PromptPay data
    const result = parsePromptPayQR(qrData);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Invalid PromptPay QR code format',
      };
    }

    return {
      success: true,
      promptPay: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to scan QR: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Mock scan for demo purposes
 * Simulates scanning with predefined test data
 */
export function mockScanPromptPayQR(scenario: 'coffee' | 'restaurant' | 'custom'): ScanQRResult {
  const mockData: Record<string, PromptPayData> = {
    coffee: {
      accountId: '0812345678',
      accountType: 'phone',
      merchantName: 'Nimman Coffee',
      amount: 150,
      currency: '764',
      country: 'TH',
      rawPayload: 'mock_coffee_payload',
      isValid: true,
    },
    restaurant: {
      accountId: '0898765432',
      accountType: 'phone',
      merchantName: 'Thai Kitchen CNX',
      amount: 450,
      currency: '764',
      country: 'TH',
      rawPayload: 'mock_restaurant_payload',
      isValid: true,
    },
    custom: {
      accountId: '0801234567',
      accountType: 'phone',
      amount: undefined, // Amount to be entered
      currency: '764',
      country: 'TH',
      rawPayload: 'mock_custom_payload',
      isValid: true,
    },
  };

  return {
    success: true,
    promptPay: mockData[scenario],
  };
}

/**
 * Format scan result for display in chat
 */
export function formatScanResultForChat(result: ScanQRResult): string {
  if (!result.success || !result.promptPay) {
    return `❌ ${result.error || 'Failed to scan QR code'}`;
  }

  const display = formatPromptPayDisplay(result.promptPay);

  let message = `✅ **PromptPay QR Detected**\n\n`;
  message += `📱 **${display.displayType}:** ${display.displayId}\n`;

  if (result.promptPay.merchantName) {
    message += `🏪 **Merchant:** ${result.promptPay.merchantName}\n`;
  }

  message += `💰 **Amount:** ${display.displayAmount}\n`;

  if (!result.promptPay.isValid) {
    message += `\n⚠️ Warning: QR checksum invalid`;
  }

  return message;
}
