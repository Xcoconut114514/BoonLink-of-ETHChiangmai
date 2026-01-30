/**
 * Offline Transaction Queue
 * Handles transaction queuing and retry for unreliable networks
 */

import {
  PaymentStatus,
  NetworkStatus,
  type PaymentOrder,
  type TransactionSignature,
  type OfflineQueueItem,
  type OfflineQueueStats,
} from '../types/index.js';
import type { QueueStorage, OrderStorage } from './storage.js';
import type { IBlockchainService } from '../services/blockchain.js';
import type { ISettlementService } from '../services/settlement.js';
import { v4 as uuidv4 } from 'uuid';

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 5000, // 5 seconds
  maxDelay: 300000, // 5 minutes
  backoffMultiplier: 2,
};

// Network check interval
const NETWORK_CHECK_INTERVAL = 10000; // 10 seconds

/**
 * Offline Queue Manager
 * Handles transaction signing, queuing, and automatic retry
 */
export class OfflineQueueManager {
  private queueStorage: QueueStorage;
  private orderStorage: OrderStorage;
  private blockchainService: IBlockchainService;
  private settlementService: ISettlementService;
  private networkStatus: NetworkStatus = NetworkStatus.ONLINE;
  private isProcessing: boolean = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    queueStorage: QueueStorage,
    orderStorage: OrderStorage,
    blockchainService: IBlockchainService,
    settlementService: ISettlementService
  ) {
    this.queueStorage = queueStorage;
    this.orderStorage = orderStorage;
    this.blockchainService = blockchainService;
    this.settlementService = settlementService;
  }

  /**
   * Start the queue processor
   */
  start(): void {
    this.checkInterval = setInterval(() => {
      this.checkNetworkAndProcess();
    }, NETWORK_CHECK_INTERVAL);

    // Initial check
    this.checkNetworkAndProcess();
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return this.networkStatus;
  }

  /**
   * Queue a signed transaction for later broadcast
   */
  async queueTransaction(
    order: PaymentOrder,
    signature: TransactionSignature
  ): Promise<OfflineQueueItem> {
    const item: OfflineQueueItem = {
      id: uuidv4(),
      order,
      signature,
      retryCount: 0,
      createdAt: Date.now(),
    };

    // Update order status
    order.status = PaymentStatus.SIGNED;
    order.signature = signature;
    order.updatedAt = Date.now();
    this.orderStorage.update(order);

    // Add to queue
    this.queueStorage.enqueue(item);

    // Trigger immediate processing if online
    if (this.networkStatus === NetworkStatus.ONLINE) {
      this.processQueue();
    }

    return item;
  }

  /**
   * Get queue statistics
   */
  getStats(): OfflineQueueStats {
    return this.queueStorage.getStats();
  }

  /**
   * Get all pending items
   */
  getPendingItems(): OfflineQueueItem[] {
    return this.queueStorage.getAll();
  }

  /**
   * Check network status
   */
  private async checkNetwork(): Promise<NetworkStatus> {
    try {
      // Try to fetch a known endpoint
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://bsc-dataseed.binance.org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'net_version', params: [], id: 1 }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const start = Date.now();
        await response.json();
        const latency = Date.now() - start;

        // Classify network quality
        if (latency < 500) {
          return NetworkStatus.ONLINE;
        } else if (latency < 2000) {
          return NetworkStatus.WEAK;
        }
      }

      return NetworkStatus.WEAK;
    } catch {
      return NetworkStatus.OFFLINE;
    }
  }

  /**
   * Check network and process queue if online
   */
  private async checkNetworkAndProcess(): Promise<void> {
    const newStatus = await this.checkNetwork();
    const previousStatus = this.networkStatus;
    this.networkStatus = newStatus;

    // If we just came online, process the queue
    if (
      previousStatus !== NetworkStatus.ONLINE &&
      newStatus === NetworkStatus.ONLINE
    ) {
      console.log('[OfflineQueue] Network restored, processing queue...');
      this.processQueue();
    }
  }

  /**
   * Process pending items in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (this.networkStatus === NetworkStatus.OFFLINE) return;

    this.isProcessing = true;

    try {
      const items = this.queueStorage.getReadyItems();

      for (const item of items) {
        // Re-check network status which may have changed
        if (this.networkStatus !== NetworkStatus.ONLINE && this.networkStatus !== NetworkStatus.WEAK) {
          break;
        }

        await this.processItem(item);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: OfflineQueueItem): Promise<void> {
    try {
      // Update status to pending
      item.order.status = PaymentStatus.PENDING;
      item.order.updatedAt = Date.now();
      this.orderStorage.update(item.order);

      // Broadcast transaction
      const txHash = await this.blockchainService.broadcastTransaction(
        item.signature.signedTx
      );

      // Update order with tx hash
      item.order.txHash = txHash;
      this.orderStorage.update(item.order);

      // Wait for confirmation
      const confirmed = await this.blockchainService.waitForConfirmation(txHash);

      if (confirmed) {
        // Settle to PromptPay
        const settlement = await this.settlementService.settle(item.order);

        if (settlement.success) {
          // Complete the order
          item.order.status = PaymentStatus.COMPLETED;
          item.order.settlementId = settlement.settlementId;
          item.order.completedAt = Date.now();
          item.order.updatedAt = Date.now();
          this.orderStorage.update(item.order);

          // Remove from queue
          this.queueStorage.dequeue(item.id);

          console.log(`[OfflineQueue] Order ${item.order.id} completed successfully`);
        } else {
          // Settlement failed, will retry
          await this.scheduleRetry(item, 'Settlement failed');
        }
      } else {
        // Transaction not confirmed
        await this.scheduleRetry(item, 'Transaction not confirmed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.scheduleRetry(item, errorMessage);
    }
  }

  /**
   * Schedule a retry for failed item
   */
  private async scheduleRetry(item: OfflineQueueItem, reason: string): Promise<void> {
    item.retryCount++;

    if (item.retryCount >= RETRY_CONFIG.maxRetries) {
      // Max retries exceeded, mark as failed
      item.order.status = PaymentStatus.FAILED;
      item.order.error = `Max retries exceeded: ${reason}`;
      item.order.updatedAt = Date.now();
      this.orderStorage.update(item.order);

      // Remove from queue
      this.queueStorage.dequeue(item.id);

      console.log(`[OfflineQueue] Order ${item.order.id} failed after max retries`);
      return;
    }

    // Calculate next retry time with exponential backoff
    const delay = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, item.retryCount - 1),
      RETRY_CONFIG.maxDelay
    );

    const nextRetry = Date.now() + delay;
    this.queueStorage.updateRetry(item.id, item.retryCount, nextRetry);

    console.log(
      `[OfflineQueue] Order ${item.order.id} scheduled for retry #${item.retryCount} in ${delay / 1000}s`
    );
  }
}

/**
 * Create a pre-signed transaction for offline queue
 */
export async function createOfflineTransaction(
  order: PaymentOrder,
  privateKey: string,
  blockchainService: IBlockchainService
): Promise<TransactionSignature> {
  // Create the transfer transaction
  const tx = await blockchainService.createTransferTx(
    order.quote.promptPay.accountId, // This would be the user's address
    '0xBoonLinkCollectionAddress', // Our collection address
    order.quote.amountCrypto,
    order.quote.token
  );

  // Sign it locally
  const signature = await blockchainService.signTransaction(tx, privateKey);

  return signature;
}
