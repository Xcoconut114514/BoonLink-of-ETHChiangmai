# BoonLink Payment Skill

Pay Thai merchants instantly with cryptocurrency via PromptPay.

## Overview

BoonLink enables crypto-to-THB instant payments in Thailand. Simply send a PromptPay QR code image, and BoonLink will:

1. **Scan** - Parse the QR code to extract payment details
2. **Quote** - Get real-time exchange rates (USDT, USDC, ETH → THB)
3. **Pay** - Execute the crypto transfer
4. **Settle** - Instantly send THB to merchant's PromptPay

## Usage

### Basic Payment Flow

```
User: [sends PromptPay QR image]
Bot: Detected payment request to Coffee Shop
     Amount: ฿150.00
     Rate: 1 USDT = ฿35.50
     You pay: 4.23 USDT
     [Confirm] [Cancel]

User: [clicks Confirm]
Bot: ✅ Payment successful!
     TX: 0x1234...abcd
     [View on BSCScan]
```

### Commands

- **Send QR image** - Start a payment
- `/rates` - Check current exchange rates
- `/status <order_id>` - Check payment status
- `/sync` - Force sync offline transactions

## Supported Tokens

| Token | Network | Min Amount | Max Amount |
|-------|---------|------------|------------|
| USDT  | BSC     | ฿10        | ฿10,000    |
| USDC  | BSC     | ฿10        | ฿10,000    |
| ETH   | BSC     | ฿10        | ฿10,000    |

## Offline Support

BoonLink works in areas with poor connectivity:

1. **Sign locally** - Transactions are signed on your device
2. **Queue** - Signed transactions are stored in local SQLite
3. **Auto-sync** - Transactions broadcast when network restores
4. **Receipt** - Get confirmation after successful settlement

## Tools

### scan_promptpay_qr

Parse a PromptPay QR code image.

```json
{
  "imageUrl": "https://example.com/qr.png"
}
```

Returns merchant info, amount, and account details.

### get_crypto_quote

Get exchange rate quote for payment.

```json
{
  "amountTHB": 150,
  "token": "USDT",
  "promptPay": { ... }
}
```

Returns quote with fees and expiration.

### confirm_payment

Execute payment with quote.

```json
{
  "quoteId": "abc123",
  "walletAddress": "0x...",
  "userId": "user123",
  "chatId": "chat456"
}
```

Returns transaction hash and receipt.

## Security

- **Local signing** - Private keys never leave your device
- **Non-custodial** - We don't hold your crypto
- **Amount limits** - ฿10,000 max per transaction
- **Rate locks** - 3-minute quote validity

## Demo Mode

For testing, set `BOONLINK_DEMO=true` to use mock services:

- Fixed exchange rates
- Simulated transactions
- No real funds moved

## API Reference

See full documentation at [docs/api.md](./docs/api.md)
