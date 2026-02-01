/**
 * PromptPay QR Code Parser (EMVCo Standard)
 *
 * PromptPay QR Structure (TLV Format):
 * 00 02 01           - Payload Format Indicator
 * 01 02 11/12        - Point of Initiation (11=Static, 12=Dynamic)
 * 29 XX              - Merchant Account Information (PromptPay)
 *    00 16 A000000677010111  - PromptPay AID
 *    01 13 00669XXXXXXXX     - Account ID (Phone/NationalID/eWallet)
 *    02 XX                   - Merchant Name (optional)
 * 53 03 764          - Transaction Currency (764 = THB)
 * 54 XX XXXX         - Transaction Amount (optional)
 * 58 02 TH           - Country Code
 * 59 XX              - Merchant Name
 * 60 XX              - Merchant City
 * 63 04 XXXX         - CRC16 Checksum
 */

/**
 * Parse PromptPay QR code data
 * @param {string} qrData - Raw QR code data string
 * @returns {{success: boolean, data?: object, error?: string}}
 */
function parsePromptPayQR(qrData) {
    try {
        // Basic validation
        if (!qrData || typeof qrData !== 'string') {
            return { success: false, error: 'Empty or invalid QR data' };
        }

        // Minimum length check
        if (qrData.length < 40) {
            return { success: false, error: 'QR data too short' };
        }

        // Parse TLV structure
        const tlv = parseTLV(qrData);

        // Validate payload format indicator (Tag 00)
        if (tlv['00'] !== '01') {
            return { success: false, error: 'Invalid payload format' };
        }

        // Get point of initiation method (Tag 01)
        const poiMethod = tlv['01'];
        const isStatic = poiMethod === '11';
        const isDynamic = poiMethod === '12';

        // Look for PromptPay merchant account
        // Tag 29 is standard for PromptPay, but also check 30, 31
        let merchantAccount = null;
        let merchantTag = null;

        for (const tag of ['29', '30', '31']) {
            if (tlv[tag]) {
                const subTlv = parseTLV(tlv[tag]);
                // Check for PromptPay AID
                if (subTlv['00'] && subTlv['00'].includes('A000000677010111')) {
                    merchantAccount = subTlv;
                    merchantTag = tag;
                    break;
                }
            }
        }

        // Also try direct parsing without AID check (some QRs don't include it)
        if (!merchantAccount && tlv['29']) {
            merchantAccount = parseTLV(tlv['29']);
            merchantTag = '29';
        }

        if (!merchantAccount) {
            return { success: false, error: 'No PromptPay merchant account found' };
        }

        // Extract account ID (Tag 01 within merchant account)
        let accountId = merchantAccount['01'] || merchantAccount['02'] || '';
        let accountType = 'unknown';

        // Determine account type
        if (accountId) {
            if (accountId.startsWith('0066') && accountId.length >= 13) {
                // Phone number with country code (0066XXXXXXXXX)
                accountType = 'phone';
                accountId = '0' + accountId.substring(4); // Convert to 0XXXXXXXXX
            } else if (accountId.startsWith('66') && accountId.length >= 11) {
                // Phone number with country code (66XXXXXXXXX)
                accountType = 'phone';
                accountId = '0' + accountId.substring(2); // Convert to 0XXXXXXXXX
            } else if (accountId.length === 10 && accountId.startsWith('0')) {
                // Local phone number
                accountType = 'phone';
            } else if (accountId.length === 13 && /^\d+$/.test(accountId)) {
                // Thai National ID
                accountType = 'national_id';
            } else if (accountId.length === 15 && /^\d+$/.test(accountId)) {
                // e-Wallet ID
                accountType = 'ewallet';
            } else if (/^\d+$/.test(accountId)) {
                // Generic numeric ID
                accountType = 'numeric';
            }
        }

        // Extract amount (Tag 54) - optional
        let amount = null;
        if (tlv['54']) {
            amount = parseFloat(tlv['54']);
            if (isNaN(amount)) amount = null;
        }

        // Extract currency (Tag 53)
        const currency = tlv['53'] || '764'; // Default to THB

        // Extract country (Tag 58)
        const country = tlv['58'] || 'TH';

        // Extract merchant name (Tag 59)
        let merchantName = tlv['59'] || null;

        // Also check within merchant account (Tag 02)
        if (!merchantName && merchantAccount['02']) {
            merchantName = merchantAccount['02'];
        }

        // Extract merchant city (Tag 60)
        const merchantCity = tlv['60'] || null;

        // Validate CRC (Tag 63)
        const crcValid = validateCRC(qrData);

        return {
            success: true,
            data: {
                accountId,
                accountType,
                amount,
                currency,
                currencyCode: getCurrencyCode(currency),
                country,
                merchantName,
                merchantCity,
                isStatic,
                isDynamic,
                crcValid,
                raw: qrData
            }
        };

    } catch (error) {
        console.error('PromptPay parse error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Parse TLV (Tag-Length-Value) structure
 * @param {string} data - TLV encoded string
 * @returns {Object} Parsed TLV object
 */
function parseTLV(data) {
    const result = {};
    let i = 0;

    while (i < data.length - 3) {
        // Tag (2 chars)
        const tag = data.substring(i, i + 2);

        // Length (2 chars, decimal)
        const lengthStr = data.substring(i + 2, i + 4);
        const length = parseInt(lengthStr, 10);

        // Validate length
        if (isNaN(length) || length < 0 || i + 4 + length > data.length) {
            break;
        }

        // Value
        const value = data.substring(i + 4, i + 4 + length);
        result[tag] = value;

        // Move to next TLV
        i += 4 + length;
    }

    return result;
}

/**
 * Validate CRC16-CCITT checksum
 * @param {string} data - Full QR data including CRC
 * @returns {boolean} Whether CRC is valid
 */
function validateCRC(data) {
    if (data.length < 8) return false;

    // CRC is in Tag 63 (last 4 chars of data)
    const payload = data.substring(0, data.length - 4);
    const providedCRC = data.substring(data.length - 4).toUpperCase();

    // Calculate CRC16-CCITT
    const calculatedCRC = calculateCRC16(payload + '6304');

    return calculatedCRC === providedCRC;
}

/**
 * Calculate CRC16-CCITT
 * @param {string} str - Input string
 * @returns {string} 4-character hex CRC
 */
function calculateCRC16(str) {
    let crc = 0xFFFF;

    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;

        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
        crc &= 0xFFFF;
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Get currency symbol/code from numeric code
 * @param {string} numericCode - ISO 4217 numeric code
 * @returns {string} Currency code
 */
function getCurrencyCode(numericCode) {
    const currencies = {
        '764': 'THB',
        '840': 'USD',
        '978': 'EUR',
        '826': 'GBP',
        '392': 'JPY',
        '156': 'CNY'
    };
    return currencies[numericCode] || 'THB';
}

/**
 * Format account ID for display
 * @param {string} accountId - Account ID
 * @param {string} accountType - Account type
 * @returns {string} Formatted display string
 */
function formatAccountDisplay(accountId, accountType) {
    if (!accountId) return 'Unknown';

    switch (accountType) {
        case 'phone':
            // Format as 0XX-XXX-XXXX
            if (accountId.length === 10 && accountId.startsWith('0')) {
                return `${accountId.slice(0, 3)}-${accountId.slice(3, 6)}-${accountId.slice(6)}`;
            }
            return accountId;

        case 'national_id':
            // Format as X-XXXX-XXXXX-XX-X
            if (accountId.length === 13) {
                return `${accountId[0]}-${accountId.slice(1, 5)}-${accountId.slice(5, 10)}-${accountId.slice(10, 12)}-${accountId[12]}`;
            }
            return accountId;

        case 'ewallet':
            // Mask middle digits
            if (accountId.length >= 8) {
                return accountId.slice(0, 4) + '****' + accountId.slice(-4);
            }
            return accountId;

        default:
            // Generic masking for long IDs
            if (accountId.length > 8) {
                return accountId.slice(0, 4) + '...' + accountId.slice(-4);
            }
            return accountId;
    }
}

/**
 * Generate a PromptPay QR code string (for testing)
 * @param {Object} options - QR options
 * @returns {string} PromptPay QR string
 */
function generatePromptPayQR(options = {}) {
    const {
        accountId = '0812345678',
        amount = null,
        merchantName = null
    } = options;

    let qr = '';

    // Payload Format Indicator
    qr += '000201';

    // Point of Initiation (11=static, 12=dynamic)
    qr += amount ? '010212' : '010211';

    // Merchant Account (Tag 29)
    let merchantData = '';
    merchantData += '0016A000000677010111'; // PromptPay AID

    // Format account ID
    let formattedId = accountId.replace(/[^0-9]/g, '');
    if (formattedId.startsWith('0') && formattedId.length === 10) {
        // Convert to international format
        formattedId = '0066' + formattedId.substring(1);
    }
    merchantData += '01' + formattedId.length.toString().padStart(2, '0') + formattedId;

    qr += '29' + merchantData.length.toString().padStart(2, '0') + merchantData;

    // Currency (THB = 764)
    qr += '5303764';

    // Amount (optional)
    if (amount && amount > 0) {
        const amountStr = amount.toFixed(2);
        qr += '54' + amountStr.length.toString().padStart(2, '0') + amountStr;
    }

    // Country Code
    qr += '5802TH';

    // Merchant Name (optional)
    if (merchantName) {
        qr += '59' + merchantName.length.toString().padStart(2, '0') + merchantName;
    }

    // Merchant City
    qr += '6007Bangkok';

    // CRC placeholder
    qr += '6304';

    // Calculate and append CRC
    const crc = calculateCRC16(qr);
    qr = qr.slice(0, -4) + '6304' + crc;

    return qr;
}

// Export for Node.js (if used in backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parsePromptPayQR,
        parseTLV,
        validateCRC,
        calculateCRC16,
        formatAccountDisplay,
        generatePromptPayQR
    };
}
