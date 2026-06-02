import initSqlJs, { type Database as SqlJsDatabase, type BindParams } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { readFileSync } from 'fs';

let db: SqlJsDatabase | null = null;
let inTransaction = false;
let activeUsername: string | null = null;

/**
 * Get the currently active username whose database is open.
 */
export function getActiveUsername(): string | null {
  return activeUsername;
}

/**
 * Get the database path for a given username.
 * If username is null, returns the legacy path.
 */
function getDbPath(username: string | null): string {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  if (username) {
    return path.join(dataDir, username, 'schedule.db');
  }
  return path.join(dataDir, 'schedule.db');
}

/**
 * Find the schema.sql file path.
 */
function findSchemaPath(): string {
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'src', 'db', 'schema.sql'),
    path.join(__dirname, '..', 'src', 'db', 'schema.sql'),
    path.join(__dirname, 'schema.sql'),
    path.join(process.cwd(), 'src', 'db', 'schema.sql'),
  ];
  const found = possiblePaths.find(p => fs.existsSync(p));
  if (!found) {
    console.error('Searched for schema.sql in:', possiblePaths);
    throw new Error('Could not find schema.sql file');
  }
  return found;
}

/**
 * Run schema on the current database.
 */
function runSchema(): void {
  if (!db) return;
  const schemaPath = findSchemaPath();
  console.log('Loading schema from:', schemaPath);
  const schema = readFileSync(schemaPath, 'utf-8');
  db.run(schema);
}

/**
 * Initialize the SQLite database connection for a specific user.
 * Creates the user's data directory and runs schema if needed.
 * If username is null, uses the legacy path (for migration).
 */
export async function initDatabase(username?: string | null): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();
  activeUsername = username ?? null;

  const dbPath = getDbPath(activeUsername);
  const dbDir = path.dirname(dbPath);

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  runSchema();
  saveDatabase();

  return db;
}

/**
 * Switch to a different user's database.
 * Closes the current database and opens the one for the given username.
 */
export async function switchDatabase(username: string): Promise<SqlJsDatabase> {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
  return initDatabase(username);
}

/**
 * Migrate legacy database to a user-specific directory.
 * Moves data/schedule.db to data/{username}/schedule.db.
 * Returns true if migration was performed.
 */
export function migrateLegacyDatabase(username: string): boolean {
  const legacyPath = getDbPath(null);
  const newPath = getDbPath(username);

  if (!fs.existsSync(legacyPath)) {
    return false;
  }

  // If user-specific DB already exists, don't overwrite
  if (fs.existsSync(newPath)) {
    return false;
  }

  const newDir = path.dirname(newPath);
  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true });
  }

  fs.renameSync(legacyPath, newPath);
  console.log(`Migrated legacy database to ${newPath}`);
  return true;
}

/**
 * Save the database to disk
 */
function saveDatabase(): void {
  if (!db) return;

  const dbPath = getDbPath(activeUsername);
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
    activeUsername = null;
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
