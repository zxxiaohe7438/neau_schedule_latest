/**
 * Credential Store — secure local credential storage.
 *
 * Uses Electron safeStorage to encrypt passwords on disk.
 * Falls back to session-only (in-memory) storage when safeStorage is unavailable.
 *
 * SECURITY RULES:
 * - Password is NEVER stored in plaintext on disk.
 * - Password is NEVER logged to console.
 * - Password is NEVER saved to the sql.js business database.
 * - Credential file lives under {userData}/data/.credentials (outside source tree).
 */

import { safeStorage, app } from 'electron';
import path from 'path';
import fs from 'fs';

interface StoredCredential {
  username: string;
  encryptedPassword: string; // base64 of safeStorage.encryptString output
}

interface CredentialFile {
  version: number;
  credentials: StoredCredential[];
}

const CREDENTIAL_FILENAME = '.credentials.json';

function getCredentialPath(): string {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, CREDENTIAL_FILENAME);
}

/**
 * Session-only fallback: holds credentials in memory when safeStorage is unavailable.
 * Credentials are lost when the app exits.
 */
let sessionFallback: { username: string; password: string } | null = null;
let useSessionFallback = false;

/**
 * Determine if safeStorage is usable in the current environment.
 */
function isSafeStorageAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/**
 * Save credentials to disk using safeStorage encryption.
 * If safeStorage is unavailable, stores in session-only memory and returns a warning.
 */
export function saveCredential(
  username: string,
  password: string
): { ok: boolean; warning?: string } {
  if (!username || !password) {
    return { ok: false, warning: '用户名和密码不能为空' };
  }

  if (!isSafeStorageAvailable()) {
    useSessionFallback = true;
    sessionFallback = { username, password };
    return {
      ok: true,
      warning: '当前环境不支持加密存储，凭据仅本次会话保存，不落盘',
    };
  }

  try {
    const encryptedBuf = safeStorage.encryptString(password);
    const encryptedBase64 = encryptedBuf.toString('base64');

    const credentialPath = getCredentialPath();
    let file: CredentialFile = { version: 1, credentials: [] };

    if (fs.existsSync(credentialPath)) {
      try {
        const raw = fs.readFileSync(credentialPath, 'utf-8');
        file = JSON.parse(raw);
      } catch {
        file = { version: 1, credentials: [] };
      }
    }

    const existing = file.credentials.findIndex((c) => c.username === username);
    const entry: StoredCredential = {
      username,
      encryptedPassword: encryptedBase64,
    };

    if (existing >= 0) {
      file.credentials[existing] = entry;
    } else {
      file.credentials.push(entry);
    }

    fs.writeFileSync(credentialPath, JSON.stringify(file, null, 2), 'utf-8');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      warning: `加密保存失败: ${err instanceof Error ? err.message : '未知错误'}`,
    };
  }
}

/**
 * Retrieve stored credentials.
 * Returns the most recently saved credential, or null if none.
 */
export function getCredential(): {
  username: string;
  password: string;
} | null {
  if (useSessionFallback) {
    return sessionFallback;
  }

  const credentialPath = getCredentialPath();
  if (!fs.existsSync(credentialPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(credentialPath, 'utf-8');
    const file: CredentialFile = JSON.parse(raw);

    if (file.credentials.length === 0) return null;

    const last = file.credentials[file.credentials.length - 1];

    if (!isSafeStorageAvailable()) {
      return { username: last.username, password: '' };
    }

    const encryptedBuf = Buffer.from(last.encryptedPassword, 'base64');
    const password = safeStorage.decryptString(encryptedBuf);

    return { username: last.username, password };
  } catch {
    return null;
  }
}

/**
 * Clear all stored credentials from disk and session.
 */
export function clearCredential(): void {
  sessionFallback = null;
  useSessionFallback = false;

  const credentialPath = getCredentialPath();
  if (fs.existsSync(credentialPath)) {
    try {
      fs.unlinkSync(credentialPath);
    } catch {
      // Ignore deletion errors
    }
  }
}

/**
 * Check if any credentials are stored.
 */
export function hasCredential(): boolean {
  if (useSessionFallback) {
    return sessionFallback !== null;
  }

  const credentialPath = getCredentialPath();
  if (!fs.existsSync(credentialPath)) return false;

  try {
    const raw = fs.readFileSync(credentialPath, 'utf-8');
    const file: CredentialFile = JSON.parse(raw);
    return file.credentials.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the credential file path (for .gitignore).
 */
export function getCredentialFilePath(): string {
  return getCredentialPath();
}
