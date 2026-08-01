import { ipcMain, Notification } from 'electron';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
}

export function registerNotificationIpc(): void {
  ipcMain.handle('notification:show', (_event, options: NotificationOptions) => {
    console.log('[notification] 收到请求:', options.title);

    if (!Notification.isSupported()) {
      console.warn('[notification] 当前系统不支持通知');
      return;
    }

    try {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        silent: false,
      });

      notification.on('show', () => {
        console.log('[notification] 通知已显示');
      });

      notification.on('failed', (_e, error) => {
        console.error('[notification] 通知显示失败:', error);
      });

      notification.show();
    } catch (err) {
      console.error('[notification] 创建通知异常:', err);
    }
  });
}
