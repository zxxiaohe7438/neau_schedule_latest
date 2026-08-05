/**
 * 学校会话服务：登录窗口管理 + 会话 Cookie 接管 + 加密备份。
 *
 * 设计要点：
 * - 登录在独立 BrowserWindow 内由用户完成（扫码/账号/微信均可），密码不经过应用代码；
 * - 会话使用专用 session 分区（persist:school），Chromium 在 Windows 上以 DPAPI 加密落盘；
 * - 登录成功后把 Cookie 集合另存为 safeStorage 加密备份（{userData}/data/school-session.json），
 *   分区被清理时可恢复；"记住登录"关闭时不写备份；
 * - 仅记录 *.neau.edu.cn 域名（统一身份认证域名除外）作为课表 API 候选域；
 * - 登录成功判定：导航到候选域后探测课表接口，返回含 xkxx 字段即视为已登录。
 */

import { app, BrowserWindow, safeStorage, session } from 'electron';
import type { Session } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  isSchoolDomain,
  isAuthServerHost,
  SCHOOL_PORTAL_URL,
  SCHOOL_WEBVPN_URL,
  SCHOOL_USER_AGENT,
  SCHOOL_SESSION_FILE_NAME,
  SCHOOL_SETTINGS_FILE_NAME,
} from '../../src/config/schoolConstants';
import type { SchoolToolbarStatus } from '../../src/domain/School';
import { fetchSchoolScheduleRaw } from './schoolFetchService';
import {
  buildBackup,
  buildCookieHeader,
  cookieToUrl,
  parseBackup,
  serializeCookies,
} from './schoolSessionFile';
import type { SessionCookieRecord } from './schoolSessionFile';

interface SchoolSettings {
  rememberLogin: boolean;
}

export class SchoolSessionService {
  private loginWindow: BrowserWindow | null = null;
  private loginPopups: BrowserWindow[] = [];
  private rememberLogin = true;
  private candidateDomains: string[] = [];
  private confirmedDomain: string | null = null;
  private lastLoginAt: string | null = null;
  private probeTimers = new Map<string, NodeJS.Timeout>();
  /** 登录窗口内课表接口响应（CDP 拦截捕获，页面自身请求成功即拿到数据） */
  private capturedScheduleText: string | null = null;
  private capturedScheduleDomain: string | null = null;
  /** 窗口内最近请求过的数据接口 URL（排障诊断用） */
  private recentResponseUrls: string[] = [];

  private get dataDir(): string {
    return path.join(app.getPath('userData'), 'data');
  }

  private get backupFilePath(): string {
    return path.join(this.dataDir, SCHOOL_SESSION_FILE_NAME);
  }

  private get settingsFilePath(): string {
    return path.join(this.dataDir, SCHOOL_SETTINGS_FILE_NAME);
  }

  /** 登录会话分区：记住登录 → 持久化分区，否则内存分区 */
  private getSession(): Session {
    return session.fromPartition(this.rememberLogin ? 'persist:school' : 'school');
  }

  // ---------- 初始化 ----------

  /** 应用启动时调用：加载设置、从分区 Cookie 恢复候选域、必要时从加密备份恢复 */
  async init(): Promise<void> {
    this.rememberLogin = this.loadSettings().rememberLogin;
    const ses = this.getSession();

    this.candidateDomains = await this.scanDomainsFromCookies(ses);
    if (this.candidateDomains.length === 0) {
      const restored = await this.restoreFromBackup(ses);
      if (restored) this.candidateDomains = [restored];
    }
    if (this.candidateDomains.length > 0) {
      // 启动时无法联网探测，先视为可用会话；实际抓取时再验证
      this.confirmedDomain = this.candidateDomains[0];
    }
  }

  private loadSettings(): SchoolSettings {
    try {
      const data = JSON.parse(fs.readFileSync(this.settingsFilePath, 'utf-8'));
      return { rememberLogin: data?.rememberLogin !== false };
    } catch {
      return { rememberLogin: true };
    }
  }

  private saveSettings(settings: SchoolSettings): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(this.settingsFilePath, JSON.stringify(settings), 'utf-8');
  }

  /** 从分区现有 Cookie 中提取学校域名候选（含 WebVPN 场景） */
  private async scanDomainsFromCookies(ses: Session): Promise<string[]> {
    try {
      const cookies = await ses.cookies.get({});
      const hosts = new Set<string>();
      for (const c of cookies) {
        if (!c.domain) continue;
        const host = c.domain.replace(/^\./, '').toLowerCase();
        if (isSchoolDomain(host) && !isAuthServerHost(host)) hosts.add(host);
      }
      return [...hosts];
    } catch {
      return [];
    }
  }

  /** 从 safeStorage 加密备份恢复 Cookie 与候选域 */
  private async restoreFromBackup(ses: Session): Promise<string | null> {
    if (!fs.existsSync(this.backupFilePath)) return null;
    try {
      if (!safeStorage.isEncryptionAvailable()) return null;
      const backup = parseBackup(fs.readFileSync(this.backupFilePath, 'utf-8'));
      if (!backup || !isSchoolDomain(backup.domain) || isAuthServerHost(backup.domain)) return null;

      const decrypted = safeStorage.decryptString(Buffer.from(backup.cookiesEnc, 'base64'));
      const cookies = JSON.parse(decrypted) as SessionCookieRecord[];
      for (const c of cookies) {
        await ses.cookies.set({
          url: cookieToUrl(c),
          name: c.name,
          value: c.value,
          path: c.path,
          secure: c.secure,
          httpOnly: c.httpOnly,
          ...(c.expirationDate !== undefined ? { expirationDate: c.expirationDate } : {}),
        });
      }
      this.lastLoginAt = backup.savedAt;
      return backup.domain;
    } catch (err) {
      console.error('恢复学校会话备份失败', err);
      return null;
    }
  }

  // ---------- 登录窗口 ----------

  /** 登录入口：校内学生入口 / 校外 WebVPN 门户 */
  openLoginWindow(entry: 'portal' | 'webvpn' = 'portal'): { ok: boolean; error?: string } {
    if (this.loginWindow && !this.loginWindow.isDestroyed()) {
      this.loginWindow.focus();
      return { ok: true };
    }

    const ses = this.getSession();
    // 统一 Edge 风格 UA（WebVPN 对 Chromium 内核 UA 敏感：Edge 可登录、Chrome 风格可能被拒）
    ses.setUserAgent(SCHOOL_USER_AGENT);

    const win = new BrowserWindow({
      width: 540,
      height: 780,
      title: '登录东北农业大学教务系统',
      autoHideMenuBar: true,
      webPreferences: {
        session: ses,
        preload: path.join(__dirname, 'schoolPreload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    this.loginWindow = win;
    this.attachNavigationListeners(win.webContents);
    this.attachResponseCapture(win.webContents);
    this.setToolbarStatus({ phase: 'idle' });

    // 弹窗（WebVPN 门户"教务系统"链接、微信扫码等）沿用同一会话并同样监听导航
    win.webContents.setWindowOpenHandler(({ url }) => {
      try {
        if (isSchoolDomain(new URL(url).hostname)) {
          const popup = new BrowserWindow({
            width: 480,
            height: 640,
            parent: win,
            autoHideMenuBar: true,
            webPreferences: {
              session: ses,
              preload: path.join(__dirname, 'schoolPreload.js'),
              contextIsolation: true,
              nodeIntegration: false,
            },
          });
          this.loginPopups.push(popup);
          this.attachNavigationListeners(popup.webContents);
          this.attachResponseCapture(popup.webContents);
          popup.on('closed', () => {
            this.loginPopups = this.loginPopups.filter((p) => p !== popup);
          });
          void popup.loadURL(url);
        }
      } catch {
        // 忽略无法解析的 URL
      }
      return { action: 'deny' };
    });

    win.on('closed', () => {
      this.loginWindow = null;
      this.loginPopups.forEach((p) => {
        if (!p.isDestroyed()) p.close();
      });
      this.loginPopups = [];
      this.probeTimers.forEach((t) => clearTimeout(t));
      this.probeTimers.clear();
    });

    win.loadURL(entry === 'webvpn' ? SCHOOL_WEBVPN_URL : SCHOOL_PORTAL_URL).catch((err) => {
      console.error('加载学校学生入口失败', err);
    });
    return { ok: true };
  }

  /** 给窗口挂导航监听：任何 frame 导航到学校域都参与候选域收集与登录探测 */
  private attachNavigationListeners(contents: Electron.WebContents): void {
    const handleNavigation = (url: string) => {
      this.handleNavigation(url);
    };
    contents.on('did-frame-navigate', (_event, url) => handleNavigation(url));
    contents.on('did-navigate-in-page', (_event, url) => handleNavigation(url));
  }

  /**
   * CDP 拦截课表接口响应（主数据路径）。
   * 课表页在登录窗口内由页面自身调用接口（WebVPN 网关对页面上下文放行），
   * 我们通过 Network.getResponseBody 直接捕获响应体，绕开"主进程重放请求被网关拒绝"的问题。
   *
   * 匹配策略（宽松）：不依赖具体接口路径——所有 XHR/Fetch 响应都尝试取响应体，
   * JSON 含 xkxx 字段即视为课表数据；同时记录窗口内请求过的 URL 供失败诊断。
   */
  private attachResponseCapture(contents: Electron.WebContents): void {
    const dbg = contents.debugger;
    try {
      dbg.attach('1.3');
    } catch {
      return; // 已附加或不可用
    }
    dbg.sendCommand('Network.enable').catch(() => undefined);

    dbg.on('message', (_event, method, params) => {
      if (method !== 'Network.responseReceived') return;
      const p = params as {
        response?: { url?: string; status?: number; mimeType?: string };
        type?: string;
        requestId: string;
      };
      const response = p.response;
      const url = response?.url ?? '';
      if (!url || (response?.status ?? 0) >= 400) return;
      const type = p.type ?? '';
      // 只处理数据请求（XHR/Fetch/文档/脚本排除），记录 URL 供诊断
      if (type !== 'XHR' && type !== 'Fetch') return;
      this.rememberResponseUrl(url);

      // 响应体就绪需要一点时间，失败静默（getResponseBody 只能取一次）
      setTimeout(() => {
        dbg
          .sendCommand('Network.getResponseBody', { requestId: p.requestId })
          .then(async (res) => {
            const body = (res as { body: string }).body;
            if (!body || body.trim() === '') return;
            try {
              const data = JSON.parse(body);
              if (!data || typeof data !== 'object' || !('xkxx' in data)) return;
            } catch {
              return;
            }
            this.capturedScheduleText = body;
            let host = '';
            try {
              host = new URL(url).hostname.toLowerCase();
            } catch {
              return;
            }
            this.capturedScheduleDomain = host;
            await this.confirmLogin(host);
            // 捕获成功不再自动关窗：提示用户点击"我已就绪"后再抓取
            this.setToolbarStatus({ phase: 'captured', domain: host });
          })
          .catch(() => undefined);
      }, 300);
    });
  }

  /** 记录窗口内最近请求过的数据接口 URL（诊断用，最多 20 条） */
  private rememberResponseUrl(url: string): void {
    this.recentResponseUrls.push(url);
    if (this.recentResponseUrls.length > 20) {
      this.recentResponseUrls.shift();
    }
  }

  /** 获取 CDP 捕获的课表接口响应（无则 null） */
  getCapturedSchedule(): { text: string; domain: string | null } | null {
    if (!this.capturedScheduleText) return null;
    return { text: this.capturedScheduleText, domain: this.capturedScheduleDomain };
  }

  /** 获取窗口内最近请求过的数据接口 URL（排障诊断用） */
  getRecentResponseUrls(): string[] {
    return [...this.recentResponseUrls];
  }

  closeLoginWindow(): void {
    if (this.loginWindow && !this.loginWindow.isDestroyed()) {
      this.loginWindow.close();
    }
  }

  /** 导航到学校域：记录候选域并推送工具条状态（不再自动探测关窗） */
  private handleNavigation(url: string): void {
    let host: string;
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch {
      return;
    }
    if (!isSchoolDomain(host) || isAuthServerHost(host)) return;

    if (!this.candidateDomains.includes(host)) {
      this.candidateDomains.push(host);
      if (this.candidateDomains.length > 5) this.candidateDomains.shift();
    }
    this.setToolbarStatus({ phase: 'navigating', domain: host });
    this.scheduleProbe(host);
  }

  /** 探测课表接口确认是否已登录（防抖 800ms，等待 CAS 票据交换完成） */
  private scheduleProbe(host: string): void {
    if (this.probeTimers.has(host)) return;
    const timer = setTimeout(async () => {
      this.probeTimers.delete(host);
      const ok = await this.probeDomain(host);
      if (ok) {
        await this.confirmLogin(host);
      }
    }, 800);
    this.probeTimers.set(host, timer);
  }

  /** 探测单个候选域：课表接口返回含 xkxx 即已登录 */
  private async probeDomain(host: string): Promise<boolean> {
    try {
      const cookieHeader = await this.buildCookieHeaderForDomain(host);
      const res = await fetchSchoolScheduleRaw(host, { cookieHeader });
      return res.ok;
    } catch (err) {
      console.error('探测学校课表接口失败', host, err);
      return false;
    }
  }

  /** 手动触发"我已登录，重新检测" */
  async refreshProbe(): Promise<void> {
    this.confirmedDomain = null;
    for (const domain of [...this.candidateDomains]) {
      if (await this.probeDomain(domain)) {
        await this.confirmLogin(domain);
        return;
      }
    }
  }

  // ---------- 就绪工具条状态 ----------

  /** 推送状态到登录窗口（含弹窗）内的就绪工具条 */
  setToolbarStatus(status: SchoolToolbarStatus): void {
    const targets = [
      this.loginWindow,
      ...this.loginPopups,
    ].filter((w): w is BrowserWindow => !!w && !w.isDestroyed());
    for (const win of targets) {
      win.webContents.send('school:toolbar-status', status);
    }
  }

  // ---------- 数据收集 ----------

  /**
   * 就绪后收集课表数据。
   * 主路径：登录窗口内 CDP 捕获的课表接口响应（页面自身请求成功即拿到数据，
   * 不受 WebVPN 网关对主进程重放请求的限制）；
   * 兜底：主进程网络重放（校内直连等网关放行场景）。
   */
  async collectScheduleData(): Promise<
    | { ok: true; text: string; domain: string | null }
    | {
        ok: false;
        expired: boolean;
        error: string;
        attempts?: Array<{ domain: string; reason: string; message: string; preview?: string }>;
      }
  > {
    const captured = this.getCapturedSchedule();
    if (captured) {
      return { ok: true, text: captured.text, domain: captured.domain };
    }

    const domains = this.getCandidateDomains();
    if (domains.length === 0) {
      return {
        ok: false,
        expired: false,
        error:
          '未捕获到课表数据且尚未登录学校系统。请确认已在登录窗口内完成登录，并进入"课表"页面后重试。',
      };
    }

    const attempts: Array<{ domain: string; reason: string; message: string; preview?: string }> = [];
    for (const domain of domains) {
      try {
        const cookieHeader = await this.buildCookieHeaderForDomain(domain);
        const raw = await fetchSchoolScheduleRaw(domain, { cookieHeader });
        if (raw.ok) {
          await this.confirmLogin(domain);
          return { ok: true, text: raw.text, domain };
        }
        attempts.push({
          domain,
          reason: raw.reason,
          message: raw.message,
          preview: raw.details.preview,
        });
      } catch (err) {
        // 单域异常（如分区 Cookie 读取失败）不中断整轮尝试
        attempts.push({
          domain,
          reason: 'error',
          message: `会话读取异常: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    const lastAttempt = attempts[attempts.length - 1];
    const detailLines = attempts
      .map((a) => `  · ${a.domain} → ${a.reason}${a.preview ? `（${a.preview}）` : ''}`)
      .join('\n');
    const recentUrls = this.getRecentResponseUrls();
    const urlLines = recentUrls.length
      ? `\n窗口内实际请求到的接口：\n${recentUrls.map((u) => `  · ${u}`).join('\n')}`
      : '';
    return {
      ok: false,
      expired: (lastAttempt?.reason ?? '') === 'expired',
      error: `${lastAttempt?.message ?? '抓取课表失败'}\n已尝试：\n${detailLines}${urlLines}\n提示：确认已在登录窗口的课表页面（或刷新页面让课表接口重新请求），再点击"我已就绪"。`,
      attempts,
    };
  }

  // ---------- 状态与数据 ----------

  async getLoginStatus(): Promise<{
    windowOpen: boolean;
    loggedIn: boolean;
    verified: boolean;
    domain: string | null;
    domains: string[];
    rememberLogin: boolean;
    lastLoginAt: string | null;
  }> {
    return {
      windowOpen: !!this.loginWindow && !this.loginWindow.isDestroyed(),
      loggedIn: this.candidateDomains.length > 0,
      verified: this.confirmedDomain != null,
      domain: this.confirmedDomain ?? this.candidateDomains[0] ?? null,
      domains: [...this.candidateDomains],
      rememberLogin: this.rememberLogin,
      lastLoginAt: this.lastLoginAt,
    };
  }

  getCandidateDomains(): string[] {
    return [...this.candidateDomains];
  }

  /** 登录成功确认：记录域名/时间，按设置保存加密备份 */
  async confirmLogin(domain: string): Promise<void> {
    if (!this.candidateDomains.includes(domain)) {
      this.candidateDomains.push(domain);
    }
    this.confirmedDomain = domain;
    this.lastLoginAt = new Date().toISOString();
    if (this.rememberLogin) {
      await this.saveBackup(domain);
    }
  }

  /** 获取某域名的会话 Cookie 头（用于抓取接口） */
  async buildCookieHeaderForDomain(domain: string): Promise<string> {
    const ses = this.getSession();
    const cookies = await ses.cookies.get({ url: `https://${domain}/` });
    return buildCookieHeader(cookies);
  }

  // ---------- 备份 ----------

  private async saveBackup(domain: string): Promise<void> {
    try {
      if (!safeStorage.isEncryptionAvailable()) return; // 环境不支持加密 → 不落盘
      const ses = this.getSession();
      const cookies = await ses.cookies.get({ url: `https://${domain}/` });
      const payload = JSON.stringify(serializeCookies(cookies));
      const cookiesEnc = safeStorage.encryptString(payload).toString('base64');
      const backup = buildBackup(domain, new Date().toISOString(), cookiesEnc);
      fs.mkdirSync(this.dataDir, { recursive: true });
      fs.writeFileSync(this.backupFilePath, JSON.stringify(backup, null, 2), 'utf-8');
    } catch (err) {
      console.error('保存学校会话备份失败', err);
    }
  }

  // ---------- 退出 ----------

  /** 清除登录：清空分区数据 + 删除备份 + 重置状态 */
  async logout(): Promise<void> {
    const ses = this.getSession();
    try {
      await ses.clearStorageData();
    } catch (err) {
      console.error('清除学校会话失败', err);
    }
    this.candidateDomains = [];
    this.confirmedDomain = null;
    this.lastLoginAt = null;
    this.capturedScheduleText = null;
    this.capturedScheduleDomain = null;
    this.recentResponseUrls = [];
    if (fs.existsSync(this.backupFilePath)) {
      try {
        fs.unlinkSync(this.backupFilePath);
      } catch {
        // 忽略删除失败
      }
    }
  }

  /** 记住登录开关：关闭时清除会话与备份，开启且已有会话时立即备份 */
  async setRememberLogin(enabled: boolean): Promise<void> {
    this.rememberLogin = enabled;
    this.saveSettings({ rememberLogin: enabled });
    if (!enabled) {
      await this.logout();
    } else if (this.confirmedDomain) {
      await this.saveBackup(this.confirmedDomain);
    }
  }
}
