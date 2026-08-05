/**
 * 学校登录窗口专用 preload。
 *
 * 在登录窗口（加载学校官方页面）内注入一个本地"就绪工具条"：
 * - 右下角浮动，Shadow DOM 样式隔离，不干扰学校页面；
 * - 实时显示抓取状态（由主进程 schoolSessionService 推送）；
 * - 用户登录并进入课表页面后，点击「我已就绪，开始抓取」通知主进程开始爬取。
 *
 * 安全边界：本 preload 只暴露 ready/close/onStatus 三个方法，
 * 不注入任何可访问学校页面 DOM 数据的 API 到 window（contextIsolation 隔离）。
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { SchoolToolbarStatus } from '../src/domain/School';

export interface SchoolToolbarApi {
  /** 通知主进程"我已就绪"，开始抓取课表 */
  ready: () => void;
  /** 关闭登录窗口 */
  close: () => void;
  /** 订阅工具条状态更新，返回取消订阅函数 */
  onStatus: (cb: (status: SchoolToolbarStatus) => void) => () => void;
}

const api: SchoolToolbarApi = {
  ready: () => ipcRenderer.send('school:user-ready'),
  close: () => ipcRenderer.send('school:close-login-window'),
  onStatus: (cb: (status: SchoolToolbarStatus) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, status: SchoolToolbarStatus) => cb(status);
    ipcRenderer.on('school:toolbar-status', listener);
    return () => {
      ipcRenderer.removeListener('school:toolbar-status', listener);
    };
  },
};

contextBridge.exposeInMainWorld('schoolToolbar', api);

// ---------- 注入浮动工具条（Shadow DOM 隔离样式） ----------

interface ToolbarPhaseMeta {
  dot: string;
  label: string;
  readyDisabled: boolean;
}

const PHASE_META: Record<SchoolToolbarStatus['phase'], ToolbarPhaseMeta> = {
  idle: { dot: '#94a3b8', label: '未检测到学校系统', readyDisabled: false },
  navigating: { dot: '#38bdf8', label: '已进入学校系统，请在课表页面就绪', readyDisabled: false },
  captured: { dot: '#22c55e', label: '✓ 已捕获课表数据，可以抓取', readyDisabled: false },
  fetching: { dot: '#f59e0b', label: '抓取中...', readyDisabled: true },
  done: { dot: '#22c55e', label: '✓ 抓取成功，正在导入', readyDisabled: true },
  error: { dot: '#ef4444', label: '抓取失败', readyDisabled: false },
};

let statusEl: HTMLSpanElement | null = null;
let dotEl: HTMLSpanElement | null = null;
let readyBtn: HTMLButtonElement | null = null;
let messageEl: HTMLDivElement | null = null;

/** 工具条注入入口（页面 DOM 就绪后执行，preload 运行时 documentElement 可能尚不存在） */
function injectToolbar(): void {
  if (document.getElementById('nea-school-toolbar-host')) return;

  const host = document.createElement('div');
  host.id = 'nea-school-toolbar-host';
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .toolbar {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(0, 229, 255, 0.4);
        border-radius: 999px;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
        font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
        color: #e2e8f0;
        font-size: 13px;
        max-width: 420px;
        cursor: default;
        user-select: none;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .message {
        font-size: 12px;
        color: #94a3b8;
        white-space: normal;
        line-height: 1.4;
        max-height: 48px;
        overflow-y: auto;
      }
      .btn {
        border: none;
        border-radius: 999px;
        padding: 7px 14px;
        font-size: 13px;
        font-family: inherit;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: filter 0.15s ease;
      }
      .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn-ready {
        background: #00e5ff;
        color: #06222b;
        font-weight: 600;
      }
      .btn-ready:not(:disabled):hover { filter: brightness(1.15); }
      .btn-close {
        background: transparent;
        color: #94a3b8;
        border: 1px solid rgba(148, 163, 184, 0.4);
      }
      .btn-close:hover { color: #e2e8f0; border-color: #94a3b8; }
    </style>
    <div class="toolbar">
      <span class="dot" id="dot"></span>
      <span class="info">
        <span class="label" id="label"></span>
        <span class="message" id="message"></span>
      </span>
      <button class="btn btn-close" id="closeBtn">关闭</button>
      <button class="btn btn-ready" id="readyBtn">我已就绪，开始抓取</button>
    </div>
  `;

  dotEl = shadow.querySelector('#dot');
  statusEl = shadow.querySelector('#label');
  messageEl = shadow.querySelector('#message');
  const ready = shadow.querySelector<HTMLButtonElement>('#readyBtn');
  const close = shadow.querySelector<HTMLButtonElement>('#closeBtn');
  readyBtn = ready;

  ready?.addEventListener('click', () => {
    api.ready();
  });
  close?.addEventListener('click', () => {
    api.close();
  });

  document.documentElement.appendChild(host);
}

/** 渲染工具条状态 */
function renderStatus(status: SchoolToolbarStatus): void {
  if (!statusEl || !dotEl || !readyBtn || !messageEl) return;
  const meta = PHASE_META[status.phase];
  dotEl.style.background = meta.dot;
  statusEl.textContent = meta.label;
  readyBtn.disabled = meta.readyDisabled;
  messageEl.textContent = status.message ?? '';
  messageEl.style.display = status.message ? '' : 'none';
}

function init(): void {
  injectToolbar();
  // 订阅主进程状态推送
  api.onStatus(renderStatus);
  // 初始状态：主进程窗口创建后会主动推送一次
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
