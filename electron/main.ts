import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from '../src/db/connection';
import { registerSemesterIpc } from './ipc/semesterIpc';
import { registerSectionTimeIpc } from './ipc/sectionTimeIpc';
import { registerCourseIpc } from './ipc/courseIpc';
import { registerCourseEventIpc } from './ipc/courseEventIpc';
import { registerImportIpc } from './ipc/importIpc';
import { registerBackupIpc } from './ipc/backupIpc';
import { registerCellAnnotationIpc } from './ipc/cellAnnotationIpc';
import { registerNotificationIpc } from './ipc/notificationIpc';
import { registerSchoolIpc } from './ipc/schoolIpc';
import { registerDevIpc } from './ipc/devIpc';
import { SchoolSessionService } from './services/schoolSessionService';

// 说明：早期为避免部分 Windows 机器 GPU 进程崩溃曾禁用硬件加速；
// 但软件渲染下多个 backdrop-filter（液态玻璃）层严重拖慢帧率（用户反馈卡顿），
// 现恢复 GPU 加速。若在特定机器上出现 GPU 崩溃/花屏，可在此恢复禁用：
// app.disableHardwareAcceleration();
if (process.platform === 'win32') {
  app.setAppUserModelId('NEAU.LocalSchedule');
}

let mainWindow: BrowserWindow | null = null;

/** 学校会话服务（登录窗口 / Cookie 接管 / 加密备份） */
const schoolSession = new SchoolSessionService();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'NEAU Local Schedule',
    // frameless：自绘赛博标题栏（TitleBar 组件）
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
    // Ensure main window keeps focus after DevTools opens
    mainWindow.focus();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 最大化状态变化通知渲染层（TitleBar 图标切换）
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized', false);
  });
}

// 窗口控制（自绘标题栏）
function registerWindowIpc(): void {
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });
}

app.whenReady().then(async () => {
  // Initialize the local database
  await initDatabase();

  // Restore school session (cookies) if any
  await schoolSession.init();

  // Window controls for frameless title bar
  registerWindowIpc();

  // Register all IPC handlers
  registerSemesterIpc();
  registerSectionTimeIpc();
  registerCourseIpc();
  registerCourseEventIpc();
  registerImportIpc();
  registerBackupIpc();
  registerCellAnnotationIpc();
  registerNotificationIpc();
  registerSchoolIpc(schoolSession, () => mainWindow);

  // Register dev-only IPC handlers in development mode
  if (process.env.VITE_DEV_SERVER_URL) {
    registerDevIpc();
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
