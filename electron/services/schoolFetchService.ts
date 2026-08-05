/**
 * 学校课表抓取服务。
 *
 * 只请求学校官方域名（*.neau.edu.cn）下的课表接口，
 * 会话通过 Cookie 头传递，不保存密码。
 * fetch 实现可注入（测试用 mock；生产用 Electron net.fetch）。
 */

import { SCHOOL_API_PATH, SCHOOL_USER_AGENT } from '../../src/config/schoolConstants';

export interface FetchResponseLike {
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export type FetchImpl = (
  url: string,
  init: { headers: Record<string, string> }
) => Promise<FetchResponseLike>;

/** 失败时的诊断细节（用于界面展示/排障校准） */
export interface FetchFailDetails {
  domain: string;
  url: string;
  status?: number;
  contentType?: string;
  /** 响应内容前 300 字符（仅文本，用于判断是否登录页/接口结构） */
  preview?: string;
}

export type SchoolFetchResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'expired' | 'network' | 'unexpected'; message: string; details: FetchFailDetails };

/** 是否可判定为"会话过期/未登录"的响应（登录页 HTML、重定向、401/403） */
export function isExpiredResponse(res: FetchResponseLike): boolean {
  if (res.status === 401 || res.status === 403) return true;
  if (res.status >= 300 && res.status < 400) return true; // 重定向回登录页
  const contentType = res.headers.get('content-type') ?? '';
  return contentType.includes('text/html'); // 返回登录页 HTML
}

/**
 * 抓取本学期课表接口。
 * @param domain 学校教务系统域名（登录窗口实际所在域，兼容校内直连与 WebVPN 映射域）
 * @param deps.cookieHeader 会话 Cookie 头（由会话服务从登录窗口分区获取）
 * @param deps.fetchImpl 可注入的 fetch 实现（测试用）
 */
export async function fetchSchoolScheduleRaw(
  domain: string,
  deps: { cookieHeader?: string; fetchImpl?: FetchImpl } = {}
): Promise<SchoolFetchResult> {
  const url = `https://${domain}${SCHOOL_API_PATH}`;
  const headers: Record<string, string> = {
    'User-Agent': SCHOOL_USER_AGENT,
    Referer: `https://${domain}/`,
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json, text/javascript, */*; q=0.01',
    ...(deps.cookieHeader ? { Cookie: deps.cookieHeader } : {}),
  };

  const failDetails = (extra: Partial<FetchFailDetails>): FetchFailDetails => ({
    domain,
    url,
    ...extra,
  });

  let res: FetchResponseLike;
  try {
    if (deps.fetchImpl) {
      res = await deps.fetchImpl(url, { headers });
    } else {
      // 惰性加载 electron，保证本模块可在无 Electron 环境下单测
      const { net } = await import('electron');
      res = await net.fetch(url, { headers });
    }
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: `网络请求失败：${err instanceof Error ? err.message : String(err)}`,
      details: failDetails({}),
    };
  }

  const text = await res.text();
  const contentType = res.headers.get('content-type') ?? '';
  if (isExpiredResponse(res)) {
    return {
      ok: false,
      reason: 'expired',
      message: '会话已过期，请重新登录学校系统',
      details: failDetails({ status: res.status, contentType, preview: previewOf(text) }),
    };
  }

  try {
    const data = JSON.parse(text);
    if (data && typeof data === 'object' && 'xkxx' in data) {
      return { ok: true, text };
    }
  } catch {
    // 非 JSON，落入下方统一错误
  }
  return {
    ok: false,
    reason: 'unexpected',
    message: '课表接口返回异常（可能已改版或会话过期）',
    details: failDetails({ status: res.status, contentType, preview: previewOf(text) }),
  };
}

/** 响应内容摘要（去空白取前 300 字符；空响应明确标注） */
function previewOf(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, 300) : '(空响应)';
}
