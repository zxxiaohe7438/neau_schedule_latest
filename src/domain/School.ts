import type { ImportResult } from './ImportResult';

/** 学校登录状态（school:loginStatus 返回值） */
export interface SchoolLoginStatus {
  /** 登录窗口是否打开中 */
  windowOpen: boolean;
  /** 是否存在候选学校域（有会话迹象） */
  loggedIn: boolean;
  /** 是否已通过课表接口探测确认登录 */
  verified: boolean;
  /** 当前生效的教务系统域名 */
  domain: string | null;
  /** 捕获到的候选学校域列表（排障用） */
  domains: string[];
  /** 是否记住登录（加密备份会话） */
  rememberLogin: boolean;
  /** 最近一次确认登录时间 */
  lastLoginAt: string | null;
}

/** 抓取课表时单个候选域的尝试结果（排障用） */
export interface SchoolFetchAttempt {
  domain: string;
  reason: string;
  message: string;
  /** 响应内容摘要（前 300 字符），用于判断是否登录页/接口结构变化 */
  preview?: string;
}

/** 抓取课表结果（school:fetchSchedule 返回值） */
export type SchoolFetchResult =
  | { ok: true; result: ImportResult }
  | {
      ok: false;
      expired: boolean;
      error: string;
      /** 逐个尝试过的候选域与失败原因（排障校准用） */
      attempts?: SchoolFetchAttempt[];
    };

/** 登录窗口内就绪工具条的状态（主进程推送，schoolPreload 展示） */
export type SchoolToolbarPhase =
  | 'idle'        // 初始：尚未进入学校域
  | 'navigating'  // 正在学校域内导航
  | 'captured'    // 已捕获课表接口数据（可点击"我已就绪"）
  | 'fetching'    // 就绪后抓取中
  | 'done'        // 抓取成功（即将自动关闭）
  | 'error';      // 抓取失败（窗口保留，可重试）

export interface SchoolToolbarStatus {
  phase: SchoolToolbarPhase;
  /** 当前所在学校域名（诊断展示用，部分阶段可能为空） */
  domain?: string | null;
  /** 错误/提示信息（phase === 'error' 时必填） */
  message?: string;
}
