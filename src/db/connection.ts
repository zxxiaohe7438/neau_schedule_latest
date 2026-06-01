import initSqlJs, { type Database as SqlJsDatabase, type BindParams } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { readFileSync } from 'fs';

let db: SqlJsDatabase | null = null;
let inTransaction = false;

/**
 * Initialize the SQLite database connection.
 * Creates the data directory and runs schema if needs.
 */
export async function initDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  // Use ASM version (pure JavaScript, no WASM loading needed)
  const SQL = await initSqlJs();

  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'schedule.db');

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL mode for better concurrent read performance
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  // Run schema - check multiple possible locations
  let schemaPath: string;

  // In development, __dirname is dist-electron, so we need to go up to project root
  // In production, __dirname is the app's resources directory
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'src', 'db', 'schema.sql'),  // Development
    path.join(__dirname, '..', 'src', 'db', 'schema.sql'),        // Alternative dev
    path.join(__dirname, 'schema.sql'),                            // Production
    path.join(process.cwd(), 'src', 'db', 'schema.sql'),          // Current working directory
  ];

  schemaPath = possiblePaths.find(p => fs.existsSync(p)) || '';

  if (!schemaPath) {
    console.error('Searched for schema.sql in:', possiblePaths);
    throw new Error('Could not find schema.sql file');
  }

  console.log('Loading schema from:', schemaPath);
  const schema = readFileSync(schemaPath, 'utf-8');
  db.run(schema);

  // Save the database
  saveDatabase();

  return db;
}

/**
 * Save the database to disk
 */
function saveDatabase(): void {
  if (!db) return;

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'data', 'schedule.db');
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

/**
 * Get the current database instance.
 */
export function getDatabase(): SqlJsDatabase | null {
  return db;
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

/**
 * Execute a query and return all rows
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function queryAll<T extends Record<string, any>>(sql: string, params: unknown[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params as BindParams);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

/**
 * Execute a query and return the first row
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function queryOne<T extends Record<string, any>>(sql: string, params: unknown[] = []): T | undefined {
  const results = queryAll<T>(sql, params);
  return results[0];
}

/**
 * Execute a statement (INSERT/UPDATE/DELETE) and return info
 */
export function execute(sql: string, params: unknown[] = []): { lastInsertRowid: number; changes: number } {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params as BindParams);

  // Get last insert rowid
  const rowidResult = db.exec('SELECT last_insert_rowid()');
  const lastInsertRowid = rowidResult.length > 0 ? rowidResult[0].values[0][0] as number : 0;

  // Get changes
  const changesResult = db.exec('SELECT changes()');
  const changes = changesResult.length > 0 ? changesResult[0].values[0][0] as number : 0;

  // Auto-save after modifications (skip during transactions)
  if (!inTransaction) {
    saveDatabase();
  }

  return { lastInsertRowid, changes };
}

/**
 * Execute multiple statements in a transaction
 */
export function transaction(fn: () => void): void {
  if (!db) throw new Error('Database not initialized');

  // Use db.exec for transaction control to avoid issues with prepared statements
  db.exec('BEGIN TRANSACTION');
  inTransaction = true;
  try {
    fn();
    db.exec('COMMIT');
    inTransaction = false;
    saveDatabase();
  } catch (error) {
    inTransaction = false;
    // Only rollback if we have an active transaction
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors - transaction may have already been rolled back
    }
    throw error;
  }
}
