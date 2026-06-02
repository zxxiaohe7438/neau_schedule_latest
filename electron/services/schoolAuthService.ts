/**
 * School Authentication Service.
 *
 * In production, this would:
 * 1. POST credentials to the school CAS login endpoint
 * 2. Handle the CAPTCHA requirement (open external browser for user to solve)
 * 3. After CAS auth, fetch the schedule callback JSON
 *
 * This module uses MOCK mode for development:
 * - Validates against mock credentials (test_student / test_pass_123)
 * - Returns mock callback data from fixtures
 * - Simulates network delay
 *
 * NEVER logs, saves, or transmits real credentials.
 */

import {
  saveCredential,
  getCredential,
  clearCredential,
  hasCredential,
  getAllCredentials,
  getActiveAccount,
  setActiveAccount,
  clearActiveAccount,
} from '../../src/security/credentialStore';
import { switchDatabase, migrateLegacyDatabase } from '../../src/db/connection';

export interface LoginResult {
  success: boolean;
  username?: string;
  error?: string;
  warning?: string;
}

export interface CallbackFetchResult {
  success: boolean;
  data?: string; // raw JSON string from callback
  error?: string;
}

/**
 * Mock credentials for development/testing.
 * These are NOT real school credentials.
 */
const MOCK_USERNAME = 'test_student';
const MOCK_PASSWORD = 'test_pass_123';

/** Simulate network delay (ms) */
const MOCK_DELAY_MS = 800;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Attempt to log in with the given credentials.
 *
 * MOCK MODE: validates against mock credentials.
 * Production mode would POST to CAS and handle CAPTCHA.
 */
export async function login(
  username: string,
  password: string
): Promise<LoginResult> {
  if (!username || !password) {
    return { success: false, error: '用户名和密码不能为空' };
  }

  // Simulate network delay
  await delay(MOCK_DELAY_MS);

  // MOCK validation
  if (username === MOCK_USERNAME && password === MOCK_PASSWORD) {
    // Save credential securely
    const saveResult = saveCredential(username, password);

    // Set as active account
    setActiveAccount(username);

    // Migrate legacy database if this is first login
    migrateLegacyDatabase(username);

    // Switch to this user's database
    await switchDatabase(username);

    return {
      success: true,
      username,
      warning: saveResult.warning,
    };
  }

  return {
    success: false,
    error: '学号或密码错误（mock 模式下请使用 test_student / test_pass_123）',
  };
}

/**
 * Logout: clear saved credentials.
 * If username is provided, only logs out that specific account.
 * If username is omitted, logs out the active account.
 */
export function logout(username?: string): void {
  if (username) {
    clearCredential(username);
  } else {
    clearActiveAccount();
    clearCredential(getSavedUsername() ?? undefined);
  }
}

/**
 * List all stored account usernames.
 */
export function listAccounts(): string[] {
  return getAllCredentials();
}

/**
 * Switch to a different account.
 * Validates the credential exists, sets active account, switches database.
 */
export async function switchAccount(username: string): Promise<{ success: boolean; error?: string }> {
  const accounts = getAllCredentials();
  if (!accounts.includes(username)) {
    return { success: false, error: `账号 ${username} 不存在` };
  }

  setActiveAccount(username);
  await switchDatabase(username);
  return { success: true };
}

/**
 * Get the currently active account username.
 */
export function getActiveAccountName(): string | null {
  return getActiveAccount();
}

/**
 * Check if user has saved credentials (auto-login possible).
 */
export function isLoggedIn(): boolean {
  return hasCredential();
}

/**
 * Get saved username (for UI display).
 */
export function getSavedUsername(): string | null {
  const cred = getCredential();
  return cred?.username ?? null;
}

/**
 * Fetch course schedule data from the school callback API.
 *
 * MOCK MODE: returns mock fixture data.
 * Production mode would:
 * 1. Use saved session cookie to call ajaxStudentSchedule/callback
 * 2. Parse the JSON response
 *
 * @param _username - The student number (unused in mock mode)
 * @returns Raw JSON string in NEAU callback format
 */
export async function fetchCallbackData(
  _username: string
): Promise<CallbackFetchResult> {
  // Simulate network delay
  await delay(MOCK_DELAY_MS);

  // Return mock callback data
  const mockData = getMockCallbackData();

  return {
    success: true,
    data: mockData,
  };
}

/**
 * Generate mock callback JSON data.
 * This is a minimal subset matching the NEAU ajaxStudentSchedule/callback format.
 * Uses ONLY mock course data — no real student information.
 */
function getMockCallbackData(): string {
  return JSON.stringify({
    xkxx: [
      {
        'MOCK001_01': {
          courseName: '数据库原理与应用',
          attendClassTeacher: '张老师',
          timeAndPlaceList: [
            {
              classDay: 1,
              classSessions: 1,
              continuingSession: 2,
              classroomName: 'A101',
              teachingBuildingName: '成栋楼',
              weekDescription: '1-16周',
              classWeek: '111111111111111100000000',
            },
          ],
          skzcs: '1-16周',
          id: { coureNumber: 'MOCK001', coureSequenceNumber: '01', executiveEducationPlanNumber: '2025-2026-2-1' },
          unit: 3.0,
        },
        'MOCK002_01': {
          courseName: '数据结构',
          attendClassTeacher: '李老师',
          timeAndPlaceList: [
            {
              classDay: 2,
              classSessions: 3,
              continuingSession: 2,
              classroomName: 'B203',
              teachingBuildingName: '成栋楼',
              weekDescription: '1-16周',
              classWeek: '111111111111111100000000',
            },
          ],
          skzcs: '1-16周',
          id: { coureNumber: 'MOCK002', coureSequenceNumber: '01', executiveEducationPlanNumber: '2025-2026-2-1' },
          unit: 4.0,
        },
        'MOCK003_01': {
          courseName: '操作系统',
          attendClassTeacher: '王老师',
          timeAndPlaceList: [
            {
              classDay: 3,
              classSessions: 1,
              continuingSession: 2,
              classroomName: 'C305',
              teachingBuildingName: '成栋楼',
              weekDescription: '1-16周 单周',
              classWeek: '101010101010101000000000',
            },
          ],
          skzcs: '1-16周',
          id: { coureNumber: 'MOCK003', coureSequenceNumber: '01', executiveEducationPlanNumber: '2025-2026-2-1' },
          unit: 3.0,
        },
        'MOCK004_01': {
          courseName: '计算机网络',
          attendClassTeacher: '赵老师',
          timeAndPlaceList: [
            {
              classDay: 4,
              classSessions: 5,
              continuingSession: 2,
              classroomName: 'A401',
              teachingBuildingName: '成栋楼',
              weekDescription: '1-18周',
              classWeek: '111111111111111111000000',
            },
          ],
          skzcs: '1-18周',
          id: { coureNumber: 'MOCK004', coureSequenceNumber: '01', executiveEducationPlanNumber: '2025-2026-2-1' },
          unit: 3.0,
        },
        'MOCK005_01': {
          courseName: '人工智能导论',
          attendClassTeacher: '代昕',
          timeAndPlaceList: [
            {
              classDay: 5,
              classSessions: 3,
              continuingSession: 2,
              classroomName: '研427',
              teachingBuildingName: '研究生楼',
              weekDescription: '1-16周 双周',
              classWeek: '010101010101010100000000',
            },
          ],
          skzcs: '1-16周',
          id: { coureNumber: 'MOCK005', coureSequenceNumber: '01', executiveEducationPlanNumber: '2025-2026-2-1' },
          unit: 2.0,
        },
        'MOCK006_01': {
          courseName: '农科大学生创业基础',
          attendClassTeacher: '网络教师',
          timeAndPlaceList: [],
          skzcs: '第1周',
          id: { coureNumber: 'MOCK006', coureSequenceNumber: '01', executiveEducationPlanNumber: '2025-2026-2-1' },
          unit: 1.0,
        },
      },
    ],
    dateList: [],
    allUnits: 16.0,
    jcsjbs: [
      { jc: '1', kssj: '08:10', jssj: '08:55' },
      { jc: '2', kssj: '09:00', jssj: '09:45' },
      { jc: '3', kssj: '10:05', jssj: '10:50' },
      { jc: '4', kssj: '10:55', jssj: '11:40' },
      { jc: '5', kssj: '13:30', jssj: '14:15' },
      { jc: '6', kssj: '14:20', jssj: '15:05' },
      { jc: '7', kssj: '15:35', jssj: '16:20' },
      { jc: '8', kssj: '16:25', jssj: '17:10' },
      { jc: '9', kssj: '18:30', jssj: '19:15' },
      { jc: '10', kssj: '19:20', jssj: '20:05' },
    ],
  });
}
