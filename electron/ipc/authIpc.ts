/**
 * Authentication IPC handlers.
 * Bridges renderer login/logout/credential-check calls to schoolAuthService.
 */

import { ipcMain } from 'electron';
import {
  login,
  logout,
  isLoggedIn,
  getSavedUsername,
  fetchCallbackData,
  listAccounts,
  switchAccount,
  getActiveAccountName,
} from '../services/schoolAuthService';
import { importSchoolIndex } from '../../src/importers/schoolIndexImporter';
import type { ImportResult } from '../../src/domain/ImportResult';

export interface AuthLoginResult {
  success: boolean;
  username?: string;
  error?: string;
  warning?: string;
}

export interface AuthStatus {
  loggedIn: boolean;
  username: string | null;
  activeUsername: string | null;
}

export function registerAuthIpc(): void {
  /**
   * Login with username and password.
   * Returns { success, username?, error?, warning? }
   */
  ipcMain.handle(
    'auth:login',
    async (_event, username: string, password: string): Promise<AuthLoginResult> => {
      return login(username, password);
    }
  );

  /**
   * Logout and clear saved credentials.
   */
  ipcMain.handle('auth:logout', (): void => {
    logout();
  });

  /**
   * Check login status.
   */
  ipcMain.handle('auth:status', (): AuthStatus => {
    return {
      loggedIn: isLoggedIn(),
      username: getSavedUsername(),
      activeUsername: getActiveAccountName(),
    };
  });

  /**
   * List all stored account usernames.
   */
  ipcMain.handle('auth:listAccounts', (): string[] => {
    return listAccounts();
  });

  /**
   * Switch to a different account.
   * Returns { success, error? }
   */
  ipcMain.handle(
    'auth:switchAccount',
    async (_event, username: string): Promise<{ success: boolean; error?: string }> => {
      return switchAccount(username);
    }
  );

  /**
   * Fetch course data from school callback API and parse it.
   * Returns ImportResult (same as other importers).
   */
  ipcMain.handle(
    'auth:fetchSchedule',
    async (_event, username: string): Promise<ImportResult> => {
      const fetchResult = await fetchCallbackData(username);

      if (!fetchResult.success || !fetchResult.data) {
        return {
          semester: { name: '', start_date: '', weeks_count: 18 },
          courses: [],
          unscheduled_courses: [],
          errors: [
            {
              index: -1,
              field: 'network',
              message: fetchResult.error ?? '获取课表数据失败',
              raw_data: null,
            },
          ],
          conflicts: [],
          total_count: 0,
        };
      }

      // Parse the callback JSON using the existing schoolIndexImporter
      const result = importSchoolIndex(fetchResult.data);
      return result;
    }
  );
}
