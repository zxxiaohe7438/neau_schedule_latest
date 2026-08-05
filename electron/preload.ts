import { contextBridge, ipcRenderer } from 'electron';
import type { Semester, SemesterCreateInput } from '../src/domain/Semester';
import type { SectionTime } from '../src/domain/SectionTime';
import type { Course, CourseUpdateInput } from '../src/domain/Course';
import type {
  CourseEvent,
  CourseEventUpdateInput,
} from '../src/domain/CourseEvent';
import type { ImportResult } from '../src/domain/ImportResult';
import type { BackupData } from '../src/domain/BackupData';
import type { SchoolLoginStatus, SchoolFetchResult } from '../src/domain/School';
import type {
  CellAnnotation,
  CellAnnotationCreateInput,
  CellAnnotationUpdateInput,
} from '../src/domain/CellAnnotation';

export interface ElectronAPI {
  // Window controls (frameless)
  window: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    /** 订阅最大化状态变化，返回取消订阅函数 */
    onMaximizedChange: (cb: (maximized: boolean) => void) => () => void;
  };
  // Semester
  semester: {
    list: () => Promise<Semester[]>;
    create: (input: SemesterCreateInput) => Promise<Semester>;
    delete: (id: number) => Promise<void>;
    archive: (id: number) => Promise<void>;
    unarchive: (id: number) => Promise<void>;
    /** 清空某学期课表内容（课程/事件/格子备注），保留学期与节次时间 */
    clearSchedule: (id: number) => Promise<void>;
    /** 清空全部数据（删除所有学期，不可恢复） */
    clearAll: () => Promise<{ success: boolean }>;
  };
  // Section Time
  sectionTime: {
    listBySemester: (semesterId: number) => Promise<SectionTime[]>;
  };
  // Course
  course: {
    listBySemester: (semesterId: number) => Promise<Course[]>;
    update: (id: number, input: CourseUpdateInput) => Promise<Course>;
    delete: (id: number) => Promise<void>;
  };
  // Course Event
  courseEvent: {
    listBySemester: (semesterId: number) => Promise<CourseEvent[]>;
    update: (id: number, input: CourseEventUpdateInput) => Promise<CourseEvent>;
    delete: (id: number) => Promise<void>;
  };
  // Import
  import: {
    importJson: (data: unknown) => Promise<ImportResult>;
    importRecognizeText: (text: string) => Promise<ImportResult>;
    /** options.overwrite = true 时覆盖目标学期现有课程/事件/备注后全量导入 */
    confirmImport: (result: ImportResult, options?: { overwrite?: boolean }) => Promise<void>;
  };
  // Backup
  backup: {
    exportTo: (semesterId: number) => Promise<string | null>;
    autoBackup: () => Promise<string>;
    importJson: (data?: BackupData) => Promise<{ success: boolean; message: string }>;
  };
  // Development only
  dev?: {
    seed: () => Promise<Semester>;
  };
  // Cell Annotations
  cellAnnotation: {
    listBySemester: (semesterId: number) => Promise<CellAnnotation[]>;
    create: (input: CellAnnotationCreateInput) => Promise<CellAnnotation>;
    update: (id: number, input: CellAnnotationUpdateInput) => Promise<CellAnnotation>;
    delete: (id: number) => Promise<void>;
  };
  // System Notification
  notification: {
    show: (options: { title: string; body: string }) => Promise<void>;
  };
  // School website schedule fetch
  school: {
    /** 打开登录窗口：portal = 校内学生入口，webvpn = 校外 WebVPN 门户 */
    openLoginWindow: (entry?: 'portal' | 'webvpn') => Promise<{ ok: boolean; error?: string }>;
    loginStatus: () => Promise<SchoolLoginStatus>;
    refreshLogin: () => Promise<void>;
    fetchSchedule: () => Promise<SchoolFetchResult>;
    /** 订阅登录窗口"我已就绪"后的抓取结果推送（主进程 → 渲染进程），返回取消订阅函数 */
    onFetchResult: (cb: (result: SchoolFetchResult) => void) => () => void;
    logout: () => Promise<void>;
    setRememberLogin: (enabled: boolean) => Promise<void>;
    /** 仅开发模式注册：离线模拟抓取（走同一解析/检测管道） */
    fetchScheduleMock?: () => Promise<SchoolFetchResult>;
  };
}

const api: ElectronAPI = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    onMaximizedChange: (cb) => {
      const listener = (_e: Electron.IpcRendererEvent, maximized: boolean) => cb(maximized);
      ipcRenderer.on('window:maximized', listener);
      return () => {
        ipcRenderer.removeListener('window:maximized', listener);
      };
    },
  },
  semester: {
    list: () => ipcRenderer.invoke('semester:list'),
    create: (input) => ipcRenderer.invoke('semester:create', input),
    delete: (id) => ipcRenderer.invoke('semester:delete', id),
    archive: (id) => ipcRenderer.invoke('semester:archive', id),
    unarchive: (id) => ipcRenderer.invoke('semester:unarchive', id),
    clearSchedule: (id) => ipcRenderer.invoke('semester:clearSchedule', id),
    clearAll: () => ipcRenderer.invoke('semester:clearAll'),
  },
  sectionTime: {
    listBySemester: (semesterId) =>
      ipcRenderer.invoke('sectionTime:listBySemester', semesterId),
  },
  course: {
    listBySemester: (semesterId) =>
      ipcRenderer.invoke('course:listBySemester', semesterId),
    update: (id, input) => {
      if (input === undefined || input === null) {
        console.error('[preload] course.update 收到空 input, id =', id);
      }
      return ipcRenderer.invoke('course:update', id, input);
    },
    delete: (id) => ipcRenderer.invoke('course:delete', id),
  },
  courseEvent: {
    listBySemester: (semesterId) =>
      ipcRenderer.invoke('courseEvent:listBySemester', semesterId),
    update: (id, input) => ipcRenderer.invoke('courseEvent:update', id, input),
    delete: (id) => ipcRenderer.invoke('courseEvent:delete', id),
  },
  import: {
    importJson: (data) => ipcRenderer.invoke('import:json', data),
    importRecognizeText: (text) => ipcRenderer.invoke('import:recognizeText', text),
    // options 为 undefined 时不传参（Electron invoke 绑定 undefined 参数会报
    // "Wrong API use: tried to bind a value of an unknown type (undefined)"）
    confirmImport: (result, options) =>
      options
        ? ipcRenderer.invoke('import:confirm', result, options)
        : ipcRenderer.invoke('import:confirm', result),
  },
  backup: {
    exportTo: (semesterId) => ipcRenderer.invoke('backup:exportTo', semesterId),
    autoBackup: () => ipcRenderer.invoke('backup:autoBackup'),
    // 无参调用（弹文件选择框）时不能传 undefined 参数（同 confirmImport 原因）
    importJson: (data) =>
      data !== undefined
        ? ipcRenderer.invoke('backup:import', data)
        : ipcRenderer.invoke('backup:import'),
  },
  dev: {
    seed: () => ipcRenderer.invoke('dev:seed'),
  },
  cellAnnotation: {
    listBySemester: (semesterId) =>
      ipcRenderer.invoke('cellAnnotation:listBySemester', semesterId),
    create: (input) => ipcRenderer.invoke('cellAnnotation:create', input),
    update: (id, input) => ipcRenderer.invoke('cellAnnotation:update', id, input),
    delete: (id) => ipcRenderer.invoke('cellAnnotation:delete', id),
  },
  notification: {
    show: (options) => ipcRenderer.invoke('notification:show', options),
  },
  school: {
    openLoginWindow: (entry) => ipcRenderer.invoke('school:openLoginWindow', entry),
    loginStatus: () => ipcRenderer.invoke('school:loginStatus'),
    refreshLogin: () => ipcRenderer.invoke('school:refreshLogin'),
    fetchSchedule: () => ipcRenderer.invoke('school:fetchSchedule'),
    onFetchResult: (cb) => {
      const listener = (_e: Electron.IpcRendererEvent, result: SchoolFetchResult) => cb(result);
      ipcRenderer.on('school:fetch-result', listener);
      return () => {
        ipcRenderer.removeListener('school:fetch-result', listener);
      };
    },
    logout: () => ipcRenderer.invoke('school:logout'),
    setRememberLogin: (enabled) => ipcRenderer.invoke('school:setRememberLogin', enabled),
    fetchScheduleMock: () => ipcRenderer.invoke('school:fetchScheduleMock'),
  },
};

contextBridge.exposeInMainWorld('api', api);
