/**
 * 学校会话文件层（纯函数，无 Electron 依赖，可单测）。
 *
 * 会话备份文件 {userData}/data/school-session.json：
 * - 不保存密码；
 * - cookies 由调用方注入的加密函数（safeStorage）加密后以 base64 存储。
 */

export interface SessionCookieRecord {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expirationDate?: number;
}

export interface SchoolSessionBackup {
  version: 1;
  savedAt: string;
  domain: string;
  cookiesEnc: string; // base64(safeStorage 加密后的 cookies JSON)
}

export const SCHOOL_SESSION_BACKUP_VERSION = 1 as const;

/** 从 Electron Cookie 对象序列化为可持久化记录（只保留必要字段；无 domain 的忽略） */
export function serializeCookies(
  cookies: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
    expirationDate?: number;
  }>
): SessionCookieRecord[] {
  return cookies
    .filter((c) => c.domain)
    .map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain!,
      path: c.path ?? '/',
      secure: c.secure ?? false,
      httpOnly: c.httpOnly ?? false,
      ...(c.expirationDate !== undefined ? { expirationDate: c.expirationDate } : {}),
    }));
}

/** 组装会话备份对象 */
export function buildBackup(
  domain: string,
  savedAt: string,
  cookiesEnc: string
): SchoolSessionBackup {
  return { version: SCHOOL_SESSION_BACKUP_VERSION, savedAt, domain, cookiesEnc };
}

/** 解析并校验备份文件内容；格式非法返回 null */
export function parseBackup(text: string): SchoolSessionBackup | null {
  try {
    const data = JSON.parse(text);
    if (
      data &&
      data.version === SCHOOL_SESSION_BACKUP_VERSION &&
      typeof data.domain === 'string' &&
      data.domain.length > 0 &&
      typeof data.cookiesEnc === 'string' &&
      data.cookiesEnc.length > 0
    ) {
      return data as SchoolSessionBackup;
    }
    return null;
  } catch {
    return null;
  }
}

/** 由 Cookie 记录还原出可写入 CookieStore 的 URL（域名去前导点 + path） */
export function cookieToUrl(cookie: SessionCookieRecord): string {
  const host = cookie.domain.replace(/^\./, '');
  const path = cookie.path.startsWith('/') ? cookie.path : `/${cookie.path}`;
  return `https://${host}${path}`;
}

/** 由 Cookie 记录拼装 HTTP Cookie 请求头 */
export function buildCookieHeader(cookies: Array<{ name: string; value: string }>): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}
