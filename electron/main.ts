import { app, BrowserWindow } from 'electron';
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
import { registerDevIpc } from './ipc/devIpc';

// Disable hardware acceleration to prevent GPU process crashes on some Windows systems
app.disableHardwareAcceleration();

// Windows 系统通知需要 AppUserModelID
if (process.platform === 'win32') {
  app.setAppUserModelId('NEAU.LocalSchedule');
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'NEAU Local Schedule',
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
}

app.whenReady().then(async () => {
  // Initialize the local database
  await initDatabase();

  // Register all IPC handlers
  registerSemesterIpc();
  registerSectionTimeIpc();
  registerCourseIpc();
  registerCourseEventIpc();
  registerImportIpc();
  registerBackupIpc();
  registerCellAnnotationIpc();
  registerNotificationIpc();

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
