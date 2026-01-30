/**
 * BoonLink Demo Script
 * Demonstrates the full payment flow
 */

import {
  initBoonLink,
  mockScanPromptPayQR,
  getCryptoQuote,
  storeQuote,
  confirmPayment,
  createCheckoutCard,
  createReceiptCard,
  cardToTextFallback,
} from './index.js';

async function runDemo() {
  console.log('='.repeat(60));
  console.log('BoonLink Payment Demo');
  console.log('='.repeat(60));

  // Initialize in demo mode
  initBoonLink({ demoMode: true });

  // Step 1: Simulate QR scan
  console.log('\n📸 Step 1: Scanning PromptPay QR...');
  const scanResult = mockScanPromptPayQR('coffee');

  if (!scanResult.success || !scanResult.promptPay) {
    console.error('Failed to scan QR:', scanResult.error);
    return;
  }

  console.log('✅ QR Scanned Successfully!');
  console.log(`   Merchant: ${scanResult.promptPay.merchantName}`);
  console.log(`   Amount: ฿${scanResult.promptPay.amount}`);
  console.log(`   Account: ${scanResult.promptPay.accountId}`);

  // Step 2: Get quote
  console.log('\n💱 Step 2: Getting exchange rate quote...');
  const quoteResult = await getCryptoQuote({
    amountTHB: scanResult.promptPay.amount!,
    token: 'USDT',
    promptPay: scanResult.promptPay,
  });

  if (!quoteResult.success || !quoteResult.quote) {
    console.error('Failed to get quote:', quoteResult.error);
    return;
  }

  const quote = quoteResult.quote;
  storeQuote(quote);

  console.log('✅ Quote Received!');
  console.log(`   Amount THB: ฿${quote.amountTHB}`);
  console.log(`   Rate: 1 ${quote.token} = ฿${quote.rate.rate.toFixed(2)}`);
  console.log(`   You Pay: ${quote.amountCrypto.toFixed(4)} ${quote.token}`);
  console.log(`   Fees: ${quote.fee.total.toFixed(4)} ${quote.token}`);

  // Display checkout card
  console.log('\n📱 Checkout Card:');
  const checkoutCard = createCheckoutCard(scanResult.promptPay, quote);
  console.log(cardToTextFallback(checkoutCard));

  // Step 3: Confirm payment
  console.log('\n💳 Step 3: Confirming payment...');
  const paymentResult = await confirmPayment({
    quoteId: quote.id,
    walletAddress: '0xDemoUserWallet123456789',
    userId: 'demo_user',
    chatId: 'demo_chat',
    orderId: '',
    signature: '',
  });

  if (!paymentResult.success) {
    console.error('Payment failed:', paymentResult.error);
    return;
  }

  console.log('✅ Payment Successful!');
  console.log(`   TX Hash: ${paymentResult.txHash}`);
  console.log(`   Order ID: ${paymentResult.order?.id}`);

  // Display receipt card
  console.log('\n🧾 Receipt Card:');
  const receiptCard = createReceiptCard(paymentResult.order!);
  console.log(cardToTextFallback(receiptCard));

  console.log('\n' + '='.repeat(60));
  console.log('Demo Complete!');
  console.log('='.repeat(60));
}

// Run demo
runDemo().catch(console.error);
