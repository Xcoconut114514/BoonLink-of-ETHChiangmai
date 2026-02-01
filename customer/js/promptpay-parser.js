// PromptPay QR Code Parser
// EMVCo QR Code format parser for Thai PromptPay

/**
 * Parse EMVCo QR Code (PromptPay format)
 * @param {string} qrData - Raw QR code data
 * @returns {object} - Parsed result with success flag and data
 */
function parsePromptPayQR(qrData) {
    try {
        console.log('Parsing QR:', qrData);

        // EMVCo QR codes start with specific format indicator
        if (!qrData || qrData.length < 10) {
            return { success: false, error: 'Invalid QR data length' };
        }

        // Try EMVCo format first
        const parsed = parseEMVCo(qrData);
        console.log('Parsed EMVCo:', parsed);

        // Check if this is a valid EMVCo QR (Tag 00 = Payload Format Indicator)
        if (!parsed['00'] || parsed['00'] !== '01') {
            // Not an EMVCo QR, try simple format
            return parseSimplePromptPay(qrData);
        }

        const result = {
            format: 'emvco',
            pointOfInitiation: parsed['01'], // 11 = static, 12 = dynamic
            merchantAccountInfo: {},
            transactionCurrency: parsed['53'] || '764', // THB = 764
            amount: null,
            countryCode: parsed['58'] || 'TH',
            merchantName: null,
            merchantCity: null,
            accountId: null,
            accountType: null
        };

        // Parse merchant account information (Tag 29, 30, 31 for PromptPay)
        for (const tag of ['29', '30', '31']) {
            if (parsed[tag]) {
                const merchantInfo = parseEMVCo(parsed[tag]);
                console.log(`Merchant info tag ${tag}:`, merchantInfo);
                result.merchantAccountInfo[tag] = merchantInfo;

                // AID (Application Identifier) - Tag 00
                if (merchantInfo['00']) {
                    result.aid = merchantInfo['00'];
                    // Verify PromptPay AID
                    if (merchantInfo['00'].includes('A000000677010111')) {
                        console.log('Valid PromptPay AID detected');
                    }
                }

                // Mobile phone - Tag 01
                if (merchantInfo['01']) {
                    result.accountId = merchantInfo['01'];
                    result.accountType = 'phone';
                }
                // National ID - Tag 02
                if (merchantInfo['02']) {
                    result.accountId = merchantInfo['02'];
                    result.accountType = 'nationalId';
                }
                // E-Wallet ID - Tag 03
                if (merchantInfo['03']) {
                    result.accountId = merchantInfo['03'];
                    result.accountType = 'ewallet';
                }
            }
        }

        // Transaction amount (Tag 54)
        if (parsed['54']) {
            result.amount = parseFloat(parsed['54']);
        }

        // Merchant name (Tag 59)
        if (parsed['59']) {
            result.merchantName = parsed['59'];
        }

        // Merchant city (Tag 60)
        if (parsed['60']) {
            result.merchantCity = parsed['60'];
        }

        // Additional data (Tag 62)
        if (parsed['62']) {
            const additionalData = parseEMVCo(parsed['62']);
            if (additionalData['01']) {
                result.billNumber = additionalData['01'];
            }
            if (additionalData['05']) {
                result.referenceLabel = additionalData['05'];
            }
            if (additionalData['07']) {
                result.terminalLabel = additionalData['07'];
            }
        }

        // Convert account ID format (0066xxxxxxxxx -> 0xxxxxxxxx)
        if (result.accountId && result.accountType === 'phone') {
            let phone = result.accountId;
            if (phone.startsWith('0066')) {
                phone = '0' + phone.substring(4);
            } else if (phone.startsWith('66') && phone.length === 11) {
                phone = '0' + phone.substring(2);
            }
            result.accountId = phone;
        }

        // Validate we have enough info
        if (!result.accountId) {
            console.log('No account ID found in parsed data');
            return { success: false, error: 'No account ID found' };
        }

        console.log('Parse result:', result);
        return { success: true, data: result };
    } catch (error) {
        console.error('Parse error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Parse EMVCo TLV format
 * @param {string} data - TLV encoded data
 * @returns {object} - Parsed tags
 */
function parseEMVCo(data) {
    const result = {};
    let pos = 0;

    while (pos < data.length - 3) {
        // Tag (2 chars)
        const tag = data.substring(pos, pos + 2);
        pos += 2;

        // Length (2 chars)
        const length = parseInt(data.substring(pos, pos + 2), 10);
        pos += 2;

        if (isNaN(length) || length < 0 || pos + length > data.length) {
            break;
        }

        // Value
        const value = data.substring(pos, pos + length);
        pos += length;

        result[tag] = value;
    }

    return result;
}

/**
 * Try to parse simple PromptPay format (just phone/ID)
 */
function parseSimplePromptPay(qrData) {
    // Some QR codes might just contain the phone number or ID directly
    const cleaned = qrData.replace(/[^0-9]/g, '');

    if (cleaned.length === 10 && cleaned.startsWith('0')) {
        // Thai phone number
        return {
            success: true,
            data: {
                format: 'simple',
                accountId: cleaned,
                accountType: 'phone',
                merchantName: null,
                amount: null
            }
        };
    }

    if (cleaned.length === 13) {
        // Thai national ID
        return {
            success: true,
            data: {
                format: 'simple',
                accountId: cleaned,
                accountType: 'nationalId',
                merchantName: null,
                amount: null
            }
        };
    }

    if (cleaned.length === 15) {
        // E-wallet or tax ID
        return {
            success: true,
            data: {
                format: 'simple',
                accountId: cleaned,
                accountType: 'ewallet',
                merchantName: null,
                amount: null
            }
        };
    }

    return { success: false, error: 'Unknown QR format' };
}

/**
 * Detect account type from account ID
 */
function detectAccountType(accountId) {
    if (!accountId) return 'unknown';

    // Remove prefix if exists (66 = Thailand country code)
    let cleaned = accountId;
    if (cleaned.startsWith('0066')) {
        cleaned = '0' + cleaned.substring(4);
    } else if (cleaned.startsWith('66')) {
        cleaned = '0' + cleaned.substring(2);
    }

    const len = cleaned.replace(/[^0-9]/g, '').length;

    if (len === 10 && (cleaned.startsWith('0') || cleaned.startsWith('66'))) {
        return 'phone';
    }
    if (len === 13) {
        return 'nationalId';
    }
    if (len === 15) {
        return 'taxId';
    }

    return 'unknown';
}

/**
 * Format account ID for display
 */
function formatAccountId(accountId, accountType) {
    if (!accountId) return '';

    switch (accountType) {
        case 'phone':
            // Thai phone: 0XX-XXX-XXXX
            const phone = accountId.replace(/[^0-9]/g, '');
            if (phone.length === 10) {
                return `${phone.substring(0, 3)}-${phone.substring(3, 6)}-${phone.substring(6)}`;
            }
            return accountId;

        case 'nationalId':
            // X-XXXX-XXXXX-XX-X
            const id = accountId.replace(/[^0-9]/g, '');
            if (id.length === 13) {
                return `${id.substring(0, 1)}-${id.substring(1, 5)}-${id.substring(5, 10)}-${id.substring(10, 12)}-${id.substring(12)}`;
            }
            return accountId;

        default:
            return accountId;
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.parsePromptPayQR = parsePromptPayQR;
    window.formatAccountId = formatAccountId;
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parsePromptPayQR, formatAccountId, parseEMVCo };
}
