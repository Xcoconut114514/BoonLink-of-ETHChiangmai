/**
 * SQLite Storage for Offline Queue
 * Local-first data persistence for transactions
 */

import Database from 'better-sqlite3';
import type {
  PaymentOrder,
  OfflineQueueItem,
  OfflineQueueStats,
  PaymentStatus,
} from '../types/index.js';

const DB_PATH = './data/boonlink.db';

/**
 * Initialize database with required tables
 */
export function initDatabase(dbPath: string = DB_PATH): Database.Database {
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Create orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      status TEXT NOT NULL,
      quote_json TEXT NOT NULL,
      signature_json TEXT,
      tx_hash TEXT,
      settlement_id TEXT,
      error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  `);

  // Create offline queue table
  db.exec(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      signed_tx TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      last_retry INTEGER,
      next_retry INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_queue_next_retry ON offline_queue(next_retry);
  `);

  // Create network status log
  db.exec(`
    CREATE TABLE IF NOT EXISTS network_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      details TEXT
    );
  `);

  return db;
}

/**
 * Storage class for payment orders
 */
export class OrderStorage {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Save a new order
   */
  save(order: PaymentOrder): void {
    const stmt = this.db.prepare(`
      INSERT INTO orders (
        id, user_id, chat_id, status, quote_json, signature_json,
        tx_hash, settlement_id, error, created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      order.id,
      order.userId,
      order.chatId,
      order.status,
      JSON.stringify(order.quote),
      order.signature ? JSON.stringify(order.signature) : null,
      order.txHash || null,
      order.settlementId || null,
      order.error || null,
      order.createdAt,
      order.updatedAt,
      order.completedAt || null
    );
  }

  /**
   * Update an existing order
   */
  update(order: PaymentOrder): void {
    const stmt = this.db.prepare(`
      UPDATE orders SET
        status = ?,
        signature_json = ?,
        tx_hash = ?,
        settlement_id = ?,
        error = ?,
        updated_at = ?,
        completed_at = ?
      WHERE id = ?
    `);

    stmt.run(
      order.status,
      order.signature ? JSON.stringify(order.signature) : null,
      order.txHash || null,
      order.settlementId || null,
      order.error || null,
      order.updatedAt,
      order.completedAt || null,
      order.id
    );
  }

  /**
   * Get order by ID
   */
  get(id: string): PaymentOrder | null {
    const stmt = this.db.prepare('SELECT * FROM orders WHERE id = ?');
    const row = stmt.get(id) as OrderRow | undefined;

    if (!row) return null;
    return this.rowToOrder(row);
  }

  /**
   * Get orders by user
   */
  getByUser(userId: string, limit: number = 50): PaymentOrder[] {
    const stmt = this.db.prepare(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    );
    const rows = stmt.all(userId, limit) as OrderRow[];
    return rows.map((row) => this.rowToOrder(row));
  }

  /**
   * Get orders by status
   */
  getByStatus(status: PaymentStatus): PaymentOrder[] {
    const stmt = this.db.prepare('SELECT * FROM orders WHERE status = ?');
    const rows = stmt.all(status) as OrderRow[];
    return rows.map((row) => this.rowToOrder(row));
  }

  /**
   * Get recent orders
   */
  getRecent(limit: number = 100): PaymentOrder[] {
    const stmt = this.db.prepare(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT ?'
    );
    const rows = stmt.all(limit) as OrderRow[];
    return rows.map((row) => this.rowToOrder(row));
  }

  private rowToOrder(row: OrderRow): PaymentOrder {
    return {
      id: row.id,
      userId: row.user_id,
      chatId: row.chat_id,
      status: row.status as PaymentStatus,
      quote: JSON.parse(row.quote_json),
      signature: row.signature_json ? JSON.parse(row.signature_json) : undefined,
      txHash: row.tx_hash || undefined,
      settlementId: row.settlement_id || undefined,
      error: row.error || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined,
    };
  }
}

interface OrderRow {
  id: string;
  user_id: string;
  chat_id: string;
  status: string;
  quote_json: string;
  signature_json: string | null;
  tx_hash: string | null;
  settlement_id: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

/**
 * Storage class for offline queue
 */
export class QueueStorage {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Add item to queue
   */
  enqueue(item: OfflineQueueItem): void {
    const stmt = this.db.prepare(`
      INSERT INTO offline_queue (
        id, order_id, signed_tx, retry_count, last_retry, next_retry, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.order.id,
      item.signature.signedTx,
      item.retryCount,
      item.lastRetry || null,
      item.nextRetry || null,
      item.createdAt
    );
  }

  /**
   * Remove item from queue
   */
  dequeue(id: string): void {
    const stmt = this.db.prepare('DELETE FROM offline_queue WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Update retry info
   */
  updateRetry(id: string, retryCount: number, nextRetry: number): void {
    const stmt = this.db.prepare(`
      UPDATE offline_queue SET
        retry_count = ?,
        last_retry = ?,
        next_retry = ?
      WHERE id = ?
    `);
    stmt.run(retryCount, Date.now(), nextRetry, id);
  }

  /**
   * Get items ready for retry
   */
  getReadyItems(): OfflineQueueItem[] {
    const stmt = this.db.prepare(`
      SELECT q.*, o.* FROM offline_queue q
      JOIN orders o ON q.order_id = o.id
      WHERE q.next_retry IS NULL OR q.next_retry <= ?
      ORDER BY q.created_at ASC
    `);

    const rows = stmt.all(Date.now()) as QueueRow[];
    return rows.map((row) => this.rowToItem(row));
  }

  /**
   * Get all pending items
   */
  getAll(): OfflineQueueItem[] {
    const stmt = this.db.prepare(`
      SELECT q.*, o.* FROM offline_queue q
      JOIN orders o ON q.order_id = o.id
      ORDER BY q.created_at ASC
    `);

    const rows = stmt.all() as QueueRow[];
    return rows.map((row) => this.rowToItem(row));
  }

  /**
   * Get queue statistics
   */
  getStats(): OfflineQueueStats {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN next_retry IS NULL OR next_retry <= ? THEN 1 ELSE 0 END) as pending,
        MIN(created_at) as oldest
      FROM offline_queue
    `).get(Date.now()) as { total: number; pending: number; oldest: number | null };

    const processingCount = 0; // Would track in-flight items

    return {
      pending: stats.pending,
      processing: processingCount,
      failed: stats.total - stats.pending - processingCount,
      totalAmount: 0, // Would calculate from joined orders
      oldestItem: stats.oldest || undefined,
    };
  }

  private rowToItem(row: QueueRow): OfflineQueueItem {
    return {
      id: row.id,
      order: {
        id: row.order_id,
        userId: row.user_id,
        chatId: row.chat_id,
        status: row.status as PaymentStatus,
        quote: JSON.parse(row.quote_json),
        signature: row.signature_json ? JSON.parse(row.signature_json) : undefined,
        txHash: row.tx_hash || undefined,
        settlementId: row.settlement_id || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      signature: {
        signedTx: row.signed_tx,
        from: '', // Would be parsed from signed_tx
        to: '',
        nonce: 0,
        gasLimit: '0',
        gasPrice: '0',
        chainId: 56,
        signedAt: row.created_at,
      },
      retryCount: row.retry_count,
      lastRetry: row.last_retry || undefined,
      nextRetry: row.next_retry || undefined,
      createdAt: row.queue_created_at || row.created_at,
    };
  }
}

interface QueueRow {
  id: string;
  order_id: string;
  signed_tx: string;
  retry_count: number;
  last_retry: number | null;
  next_retry: number | null;
  queue_created_at?: number;
  // Joined from orders
  user_id: string;
  chat_id: string;
  status: string;
  quote_json: string;
  signature_json: string | null;
  tx_hash: string | null;
  settlement_id: string | null;
  created_at: number;
  updated_at: number;
}
