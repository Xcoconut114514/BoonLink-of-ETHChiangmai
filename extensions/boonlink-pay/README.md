# BoonLink Pay - OpenClaw Extension

Instant crypto-to-THB payment via PromptPay for merchants in Thailand.

## Features

- 📸 **QR Scanning** - Parse PromptPay QR codes using AI vision
- 💱 **Real-time Rates** - Get live exchange rates from multiple sources
- ⚡ **Instant Settlement** - THB arrives in merchant's account immediately
- 📴 **Offline Support** - Sign transactions locally, sync when online
- 🎨 **A2UI Cards** - Beautiful payment UI in chat

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in demo mode
BOONLINK_DEMO=true pnpm dev

# Run tests
pnpm test
```

## Integration with OpenClaw

1. Copy this extension to `openclaw/extensions/boonlink-pay`
2. Add to OpenClaw config:

```json
{
  "extensions": ["boonlink-pay"]
}
```

3. The tools will be automatically available to the AI agent.

## Tools

| Tool | Description |
|------|-------------|
| `scan_promptpay_qr` | Parse QR code image |
| `get_crypto_quote` | Get exchange rate quote |
| `confirm_payment` | Execute payment |
| `check_payment_status` | Check order status |
| `get_exchange_rates` | Get all rates |

## Configuration

Set environment variables:

```env
BOONLINK_DEMO=true          # Use mock services
BOONLINK_MAX_AMOUNT=10000   # Max THB per transaction
BOONLINK_DEFAULT_TOKEN=USDT # Default token
```

## Architecture

```
User → Telegram → OpenClaw → BoonLink Extension
                              ├── QR Parser
                              ├── Exchange Service
                              ├── Blockchain Service (BSC)
                              ├── Settlement Service (PromptPay)
                              └── Offline Queue (SQLite)
```

## Supported Tokens

- USDT (BEP-20)
- USDC (BEP-20)
- ETH/BNB (Native)

## License

MIT
