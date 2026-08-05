/**
 * 学校官网课表获取 IPC。
 * 登录窗口 / 会话管理由 SchoolSessionService 负责，抓取由 SchoolFetchService 负责，
 * 解析与冲突检测复用现有导入管道（importSchoolIndex + checkDuplicatesAndConflicts）。
 *
 * 交互：用户在主窗口打开登录窗口 → 登录并进入课表页 → 点击登录窗口内"我已就绪"按钮
 * （school:user-ready）→ 主进程抓取 → 结果推送主窗口（school:fetch-result）→ 导入预览。
 */
import { ipcMain, app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { SchoolSessionService } from '../services/schoolSessionService';
import { importSchoolIndex } from '../../src/importers/schoolIndexImporter';
import { checkDuplicatesAndConflicts } from './importIpc';
import { createCourseEventRepo } from '../../src/db/repositories/courseEventRepo';
import type { SchoolFetchResult } from '../../src/domain/School';

/** 最近一次抓取失败的诊断（写入 {userData}/data/school-fetch-error.log，排障用） */
function recordFetchError(
  message: string,
  attempts?: Array<{ domain: string; reason: string; message: string; preview?: string }>
): void {
  try {
    const dir = path.join(app.getPath('userData'), 'data');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'school-fetch-error.log'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          message,
          attempts,
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch {
    // 诊断记录失败不影响主流程
  }
}

export function registerSchoolIpc(
  sessionService: SchoolSessionService,
  getMainWindow: () => BrowserWindow | null
): void {
  const courseEventRepo = createCourseEventRepo();

  ipcMain.handle(
    'school:openLoginWindow',
    (_event, entry: 'portal' | 'webvpn' = 'portal'): { ok: boolean; error?: string } => {
      return sessionService.openLoginWindow(entry);
    }
  );

  ipcMain.handle('school:loginStatus', async () => {
    return sessionService.getLoginStatus();
  });

  ipcMain.handle('school:refreshLogin', async (): Promise<void> => {
    await sessionService.refreshProbe();
  });

  /** 就绪后抓取 + 解析 + 冲突检测（主窗口按钮与登录窗口"我已就绪"共用） */
  const fetchAndParse = async (): Promise<SchoolFetchResult> => {
    const data = await sessionService.collectScheduleData();
    if (!data.ok) {
      return {
        ok: false,
        expired: data.expired,
        error: data.error,
        attempts: data.attempts,
      };
    }
    const result = importSchoolIndex(data.text);
    if (data.domain) {
      await sessionService.confirmLogin(data.domain);
    }
    checkDuplicatesAndConflicts(result, courseEventRepo);
    return { ok: true, result };
  };

  ipcMain.handle('school:fetchSchedule', async (): Promise<SchoolFetchResult> => {
    return fetchAndParse();
  });

  /** 登录窗口内"我已就绪"按钮：确认就绪 → 抓取 → 推送主窗口 → 更新工具条状态 */
  ipcMain.on('school:user-ready', () => {
    void (async () => {
      sessionService.setToolbarStatus({ phase: 'fetching' });
      try {
        const result = await fetchAndParse();
        const mainWindow = getMainWindow();
        if (result.ok) {
          // 数据已到手：通知主窗口进入导入预览，短暂展示成功后关闭登录窗口
          mainWindow?.webContents.send('school:fetch-result', result);
          sessionService.setToolbarStatus({ phase: 'done' });
          setTimeout(() => sessionService.closeLoginWindow(), 800);
        } else {
          // 失败：窗口保留，工具条显示原因，用户可刷新课表页重试
          sessionService.setToolbarStatus({ phase: 'error', message: result.error });
          recordFetchError(result.error, result.attempts);
        }
      } catch (err) {
        // 异常兜底：不卡死在"抓取中"，记录诊断便于排障
        const message = err instanceof Error ? err.message : String(err);
        console.error('抓取课表异常:', err);
        sessionService.setToolbarStatus({ phase: 'error', message: `抓取异常: ${message}` });
        recordFetchError(`抓取异常: ${message}`);
      }
    })();
  });

  /** 登录窗口内"关闭"按钮 */
  ipcMain.on('school:close-login-window', () => {
    sessionService.closeLoginWindow();
  });

  ipcMain.handle('school:logout', async (): Promise<void> => {
    await sessionService.logout();
  });

  ipcMain.handle('school:setRememberLogin', async (_event, enabled: boolean): Promise<void> => {
    await sessionService.setRememberLogin(enabled);
  });

  // 开发模式：离线模拟抓取（走同一解析/检测管道，便于无网络环境演示与联调）
  if (process.env.VITE_DEV_SERVER_URL) {
    ipcMain.handle('school:fetchScheduleMock', (): SchoolFetchResult => {
      const fixturePath = path.join(
        app.getAppPath(),
        'tests',
        'fixtures',
        'mock-callback-response.json'
      );
      const text = fs.readFileSync(fixturePath, 'utf-8');
      const result = importSchoolIndex(text);
      checkDuplicatesAndConflicts(result, courseEventRepo);
      return { ok: true, result };
    });
  }
}
