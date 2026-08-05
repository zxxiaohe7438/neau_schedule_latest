import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import {
  fetchSchoolScheduleRaw,
  isExpiredResponse,
} from '../electron/services/schoolFetchService';
import type { FetchImpl, FetchResponseLike } from '../electron/services/schoolFetchService';

/** 构造测试用响应对象 */
function makeResponse(
  status: number,
  body: string,
  contentType = 'application/json'
): FetchResponseLike {
  return {
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
  };
}

describe('isExpiredResponse', () => {
  it('401/403/重定向/HTML 均视为会话过期', () => {
    expect(isExpiredResponse(makeResponse(401, '{}'))).toBe(true);
    expect(isExpiredResponse(makeResponse(403, '{}'))).toBe(true);
    expect(isExpiredResponse(makeResponse(302, ''))).toBe(true);
    expect(isExpiredResponse(makeResponse(200, '<html>login</html>', 'text/html'))).toBe(true);
  });

  it('200 JSON 视为正常响应', () => {
    expect(isExpiredResponse(makeResponse(200, '{"xkxx":[]}'))).toBe(false);
  });
});

describe('fetchSchoolScheduleRaw（注入 mock fetch）', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'mock-callback-response.json');
  const fixtureData = readFileSync(fixturePath, 'utf-8');

  it('正常返回含 xkxx 的课表 JSON', async () => {
    const fetchImpl: FetchImpl = async () => makeResponse(200, fixtureData);
    const res = await fetchSchoolScheduleRaw('zhjwxs.neau.edu.cn', { fetchImpl });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(JSON.parse(res.text).xkxx).toBeDefined();
    }
  });

  it('请求头包含 UA / Referer / Cookie', async () => {
    let captured: Record<string, string> | null = null;
    const fetchImpl: FetchImpl = async (_url, init) => {
      captured = init.headers;
      return makeResponse(200, fixtureData);
    };
    await fetchSchoolScheduleRaw('zhjwxs.neau.edu.cn', {
      cookieHeader: 'JSESSIONID=abc',
      fetchImpl,
    });
    expect(captured?.['User-Agent']).toContain('Mozilla');
    expect(captured?.['Referer']).toBe('https://zhjwxs.neau.edu.cn/');
    expect(captured?.['Cookie']).toBe('JSESSIONID=abc');
  });

  it('请求 URL 为学校课表接口路径', async () => {
    let capturedUrl = '';
    const fetchImpl: FetchImpl = async (url) => {
      capturedUrl = url;
      return makeResponse(200, fixtureData);
    };
    await fetchSchoolScheduleRaw('jwxt.neau.edu.cn', { fetchImpl });
    expect(capturedUrl).toBe(
      'https://jwxt.neau.edu.cn/student/courseSelect/thisSemesterCurriculum/ajaxStudentSchedule/callback'
    );
  });

  it('会话过期（302 重定向）→ reason expired', async () => {
    const fetchImpl: FetchImpl = async () => makeResponse(302, '');
    const res = await fetchSchoolScheduleRaw('zhjwxs.neau.edu.cn', { fetchImpl });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('expired');
      expect(res.details.status).toBe(302);
    }
  });

  it('会话过期（登录页 HTML）→ reason expired', async () => {
    const fetchImpl: FetchImpl = async () => makeResponse(200, '<html>login</html>', 'text/html');
    const res = await fetchSchoolScheduleRaw('zhjwxs.neau.edu.cn', { fetchImpl });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('expired');
  });

  it('网络错误 → reason network', async () => {
    const fetchImpl: FetchImpl = async () => {
      throw new Error('ECONNREFUSED');
    };
    const res = await fetchSchoolScheduleRaw('zhjwxs.neau.edu.cn', { fetchImpl });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('network');
      expect(res.message).toContain('ECONNREFUSED');
    }
  });

  it('JSON 但无 xkxx（接口改版/异常）→ reason unexpected', async () => {
    const fetchImpl: FetchImpl = async () => makeResponse(200, '{"message":"系统繁忙"}');
    const res = await fetchSchoolScheduleRaw('zhjwxs.neau.edu.cn', { fetchImpl });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('unexpected');
      // 诊断细节：带域名、状态码与响应摘要，供排障校准
      expect(res.details.domain).toBe('zhjwxs.neau.edu.cn');
      expect(res.details.status).toBe(200);
      expect(res.details.preview).toContain('系统繁忙');
    }
  });

  it('非 JSON 响应 → reason unexpected', async () => {
    const fetchImpl: FetchImpl = async () => makeResponse(200, '<script>alert(1)</script>');
    const res = await fetchSchoolScheduleRaw('zhjwxs.neau.edu.cn', { fetchImpl });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('unexpected');
  });
});
