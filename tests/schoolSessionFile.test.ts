import { describe, it, expect } from 'vitest';
import {
  serializeCookies,
  buildBackup,
  parseBackup,
  cookieToUrl,
  buildCookieHeader,
  SCHOOL_SESSION_BACKUP_VERSION,
} from '../electron/services/schoolSessionFile';
import { isSchoolDomain, isAuthServerHost } from '../src/config/schoolConstants';

describe('schoolSessionFile', () => {
  it('serializeCookies 保留必要字段并忽略无 domain 的 Cookie', () => {
    const records = serializeCookies([
      { name: 'JSESSIONID', value: 'abc123', domain: '.zhjwxs.neau.edu.cn', path: '/', httpOnly: true },
      { name: 'no-domain', value: 'x', path: '/' },
      { name: 'session', value: 'y', domain: 'authserver.neau.edu.cn', expirationDate: 1780000000 },
    ]);
    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({
      name: 'JSESSIONID',
      value: 'abc123',
      domain: '.zhjwxs.neau.edu.cn',
      path: '/',
      secure: false,
      httpOnly: true,
    });
    expect(records[1].expirationDate).toBe(1780000000);
  });

  it('buildBackup 组装版本 1 备份对象', () => {
    const backup = buildBackup('zhjwxs.neau.edu.cn', '2026-08-03T00:00:00.000Z', 'ZW5jcnlwdGVk');
    expect(backup.version).toBe(SCHOOL_SESSION_BACKUP_VERSION);
    expect(backup.domain).toBe('zhjwxs.neau.edu.cn');
    expect(backup.cookiesEnc).toBe('ZW5jcnlwdGVk');
  });

  it('parseBackup 解析合法备份', () => {
    const backup = parseBackup(
      JSON.stringify({
        version: 1,
        savedAt: '2026-08-03T00:00:00.000Z',
        domain: 'zhjwxs.neau.edu.cn',
        cookiesEnc: 'ZW5jcnlwdGVk',
      })
    );
    expect(backup?.domain).toBe('zhjwxs.neau.edu.cn');
    expect(backup?.cookiesEnc).toBe('ZW5jcnlwdGVk');
  });

  it('parseBackup 拒绝非法备份（坏 JSON / 版本不符 / 缺字段）', () => {
    expect(parseBackup('not json')).toBeNull();
    expect(parseBackup('{"version":2,"domain":"x","cookiesEnc":"y"}')).toBeNull();
    expect(parseBackup('{"version":1,"domain":"","cookiesEnc":"y"}')).toBeNull();
    expect(parseBackup('{"version":1,"domain":"x","cookiesEnc":""}')).toBeNull();
  });

  it('cookieToUrl 去前导点并拼接 path', () => {
    expect(cookieToUrl({ name: 'a', value: 'b', domain: '.zhjwxs.neau.edu.cn', path: '/', secure: false, httpOnly: false }))
      .toBe('https://zhjwxs.neau.edu.cn/');
    expect(cookieToUrl({ name: 'a', value: 'b', domain: 'jwxt.neau.edu.cn', path: '/student', secure: false, httpOnly: false }))
      .toBe('https://jwxt.neau.edu.cn/student');
  });

  it('buildCookieHeader 拼接 Cookie 请求头', () => {
    expect(
      buildCookieHeader([
        { name: 'JSESSIONID', value: 'abc' },
        { name: 'route', value: 'r1' },
      ])
    ).toBe('JSESSIONID=abc; route=r1');
  });
});

describe('schoolConstants 域名白名单', () => {
  it('isSchoolDomain 只匹配学校官方域名（含子域）', () => {
    expect(isSchoolDomain('jwc.neau.edu.cn')).toBe(true);
    expect(isSchoolDomain('zhjwxs.neau.edu.cn')).toBe(true);
    expect(isSchoolDomain('webvpn.neau.edu.cn')).toBe(true);
    expect(isSchoolDomain('zhjwxs-443.webvpn.neau.edu.cn')).toBe(true); // WebVPN 映射域
    expect(isSchoolDomain('neau.edu.cn')).toBe(true);
    expect(isSchoolDomain('example.com')).toBe(false);
    expect(isSchoolDomain('neau.edu.cn.evil.com')).toBe(false);
    expect(isSchoolDomain('authserver.neau.edu.cn')).toBe(true); // 是学校域但不是 API 域
  });

  it('isAuthServerHost 识别统一身份认证域名与 WebVPN 认证映射域', () => {
    expect(isAuthServerHost('authserver.neau.edu.cn')).toBe(true);
    expect(isAuthServerHost('cas.neau.edu.cn')).toBe(true);
    // WebVPN 认证映射域（{内网主机}-{端口}.webvpn.neau.edu.cn）不算 API 域
    expect(isAuthServerHost('authserver-443.webvpn.neau.edu.cn')).toBe(true);
    expect(isAuthServerHost('cas-443.webvpn.neau.edu.cn')).toBe(true);
    // WebVPN 下教务系统映射域是合法 API 候选域
    expect(isAuthServerHost('zhjwxs-443.webvpn.neau.edu.cn')).toBe(false);
    expect(isAuthServerHost('zhjwxs.neau.edu.cn')).toBe(false);
  });
});
