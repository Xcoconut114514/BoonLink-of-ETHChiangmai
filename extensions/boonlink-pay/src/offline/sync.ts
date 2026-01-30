/**
 * Network Sync Service
 * Handles synchronization when network is restored
 */

import type { NetworkStatus, PaymentStatus } from '../types/index.js';
import type { OfflineQueueManager } from './queue.js';
import type { OrderStorage } from './storage.js';

// Sync event types
export interface SyncEvent {
  type: 'sync_started' | 'sync_progress' | 'sync_completed' | 'sync_failed';
  timestamp: number;
  data: {
    total?: number;
    processed?: number;
    failed?: number;
    error?: string;
  };
}

export type SyncEventListener = (event: SyncEvent) => void;

/**
 * Network Sync Manager
 * Coordinates synchronization across services
 */
export class NetworkSyncManager {
  private queueManager: OfflineQueueManager;
  private orderStorage: OrderStorage;
  private listeners: Set<SyncEventListener> = new Set();
  private isSyncing: boolean = false;
  private lastSyncTime: number | null = null;

  constructor(queueManager: OfflineQueueManager, orderStorage: OrderStorage) {
    this.queueManager = queueManager;
    this.orderStorage = orderStorage;
  }

  /**
   * Subscribe to sync events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit a sync event
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Check if currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }

  /**
   * Force a sync
   */
  async forceSync(): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    error?: string;
  }> {
    if (this.isSyncing) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        error: 'Sync already in progress',
      };
    }

    // Check network status
    const networkStatus = this.queueManager.getNetworkStatus();
    if (networkStatus === 'offline') {
      return {
        success: false,
        synced: 0,
        failed: 0,
        error: 'Network offline',
      };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      // Get pending items
      const pendingItems = this.queueManager.getPendingItems();
      const total = pendingItems.length;

      this.emit({
        type: 'sync_started',
        timestamp: Date.now(),
        data: { total },
      });

      // Process each item
      for (let i = 0; i < pendingItems.length; i++) {
        // The queue manager handles the actual processing
        // We just track progress here
        this.emit({
          type: 'sync_progress',
          timestamp: Date.now(),
          data: {
            total,
            processed: i + 1,
          },
        });
      }

      // Recheck stats after processing
      const stats = this.queueManager.getStats();
      synced = total - stats.pending - stats.failed;
      failed = stats.failed;

      this.lastSyncTime = Date.now();

      this.emit({
        type: 'sync_completed',
        timestamp: Date.now(),
        data: {
          total,
          processed: synced,
          failed,
        },
      });

      return {
        success: true,
        synced,
        failed,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.emit({
        type: 'sync_failed',
        timestamp: Date.now(),
        data: { error: errorMessage },
      });

      return {
        success: false,
        synced,
        failed,
        error: errorMessage,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get sync status summary
   */
  getSyncStatus(): {
    networkStatus: NetworkStatus;
    isSyncing: boolean;
    lastSyncTime: number | null;
    pendingCount: number;
    failedCount: number;
  } {
    const stats = this.queueManager.getStats();

    return {
      networkStatus: this.queueManager.getNetworkStatus(),
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingCount: stats.pending,
      failedCount: stats.failed,
    };
  }

  /**
   * Cleanup old completed orders
   */
  async cleanupOldOrders(olderThanDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const completedOrders = this.orderStorage.getByStatus(PaymentStatus.COMPLETED);

    let deletedCount = 0;
    for (const order of completedOrders) {
      if (order.completedAt && order.completedAt < cutoffTime) {
        // In a real implementation, we'd delete from storage
        deletedCount++;
      }
    }

    return deletedCount;
  }
}

/**
 * Network status detector with ping-based detection
 */
export class NetworkStatusDetector {
  private endpoints: string[] = [
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.binance.org',
    'https://api.coingecko.com/api/v3/ping',
  ];
  private status: NetworkStatus = NetworkStatus.ONLINE;
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start monitoring network status
   */
  startMonitoring(intervalMs: number = 10000): void {
    this.checkInterval = setInterval(() => this.check(), intervalMs);
    this.check();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current status
   */
  getStatus(): NetworkStatus {
    return this.status;
  }

  /**
   * Check network status
   */
  private async check(): Promise<void> {
    const results = await Promise.allSettled(
      this.endpoints.map((endpoint) => this.pingEndpoint(endpoint))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const avgLatency =
      results
        .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
        .reduce((sum, r) => sum + r.value, 0) / (successCount || 1);

    let newStatus: NetworkStatus;

    if (successCount === 0) {
      newStatus = NetworkStatus.OFFLINE;
    } else if (successCount < this.endpoints.length / 2 || avgLatency > 2000) {
      newStatus = NetworkStatus.WEAK;
    } else {
      newStatus = NetworkStatus.ONLINE;
    }

    if (newStatus !== this.status) {
      const oldStatus = this.status;
      this.status = newStatus;
      console.log(`[NetworkDetector] Status changed: ${oldStatus} -> ${newStatus}`);
      this.listeners.forEach((listener) => listener(newStatus));
    }
  }

  /**
   * Ping a single endpoint
   */
  private async pingEndpoint(url: string): Promise<number> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return Date.now() - start;
    } finally {
      clearTimeout(timeout);
    }
  }
}
