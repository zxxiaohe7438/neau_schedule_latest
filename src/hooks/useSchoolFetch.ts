import { useState, useEffect, useCallback } from 'react';
import type { ImportResult } from '../domain/ImportResult';
import type { SchoolFetchResult, SchoolLoginStatus } from '../domain/School';

interface UseSchoolFetchOptions {
  /** 抓取结果进入现有导入预览 */
  onResult: (result: ImportResult) => void;
  onClose: () => void;
}

/** 学期信息草稿（抓取后由用户确认/修正再进入导入预览） */
export interface SemesterDraft {
  name: string;
  start_date: string;
  weeks_count: number;
}

/**
 * 官网抓取状态机：登录状态轮询 → 打开登录窗口 → 抓取课表 → 学期信息确认 → 进入导入预览。
 * 开发模式下支持离线模拟数据（走同一解析/检测管道）。
 */
export function useSchoolFetch({ onResult, onClose }: UseSchoolFetchOptions) {
  const [status, setStatus] = useState<SchoolLoginStatus | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<ImportResult | null>(null);
  const [semesterDraft, setSemesterDraft] = useState<SemesterDraft | null>(null);

  // 登录窗口打开期间轮询登录状态（2s 间隔）
  useEffect(() => {
    let timer: number | undefined;
    let disposed = false;

    const poll = async () => {
      try {
        const s = await window.api.school.loginStatus();
        if (disposed) return;
        setStatus(s);
        if (s.windowOpen) {
          timer = window.setTimeout(poll, 2000);
        }
      } catch {
        // 状态查询失败时停止轮询，避免报错循环
      }
    };
    void poll();

    return () => {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, []);

  const openLoginWindow = useCallback(async (entry?: 'portal' | 'webvpn') => {
    setError(null);
    try {
      const res = await window.api.school.openLoginWindow(entry);
      if (!res.ok) setError(res.error ?? '打开登录窗口失败');
    } catch (err) {
      setError(err instanceof Error ? err.message : '打开登录窗口失败');
    }
  }, []);

  const handleFetchResult = useCallback((res: { ok: true; result: ImportResult }) => {
    setPendingResult(res.result);
    setSemesterDraft({
      name: res.result.semester.name,
      start_date: res.result.semester.start_date,
      weeks_count: res.result.semester.weeks_count,
    });
  }, []);

  /** 处理抓取结果推送（登录窗口"我已就绪"触发，主进程推送到主窗口） */
  const handlePushedResult = useCallback(
    (res: SchoolFetchResult) => {
      if (res.ok) {
        handleFetchResult(res);
      } else {
        setError(res.error);
      }
    },
    [handleFetchResult]
  );

  // 订阅登录窗口"我已就绪"后的抓取结果推送
  useEffect(() => {
    const unsubscribe = window.api.school.onFetchResult(handlePushedResult);
    return unsubscribe;
  }, [handlePushedResult]);

  const fetchSchedule = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await window.api.school.fetchSchedule();
      if (res.ok) {
        handleFetchResult(res);
      } else {
        setError(res.expired ? `${res.error}\n请重新打开登录窗口完成登录。` : res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '抓取课表失败');
    } finally {
      setFetching(false);
    }
  }, [handleFetchResult]);

  /** 开发模式：离线模拟抓取（学校系统不可达时演示完整流程） */
  const fetchScheduleMock = useCallback(async () => {
    if (!window.api.school.fetchScheduleMock) return;
    setFetching(true);
    setError(null);
    try {
      const res = await window.api.school.fetchScheduleMock();
      if (res.ok) {
        handleFetchResult(res);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '模拟抓取失败');
    } finally {
      setFetching(false);
    }
  }, [handleFetchResult]);

  /** 确认学期信息并进入导入预览 */
  const confirmSemester = useCallback(() => {
    if (!pendingResult || !semesterDraft) return;
    const result = {
      ...pendingResult,
      semester: { ...semesterDraft },
    };
    onResult(result);
    onClose();
  }, [pendingResult, semesterDraft, onResult, onClose]);

  const cancelSemester = useCallback(() => {
    setPendingResult(null);
    setSemesterDraft(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await window.api.school.logout();
      setStatus(await window.api.school.loginStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : '清除登录失败');
    }
  }, []);

  const setRememberLogin = useCallback(async (enabled: boolean) => {
    try {
      await window.api.school.setRememberLogin(enabled);
      setStatus(await window.api.school.loginStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置失败');
    }
  }, []);

  return {
    status,
    fetching,
    error,
    pendingResult,
    semesterDraft,
    setSemesterDraft,
    openLoginWindow,
    fetchSchedule,
    fetchScheduleMock,
    confirmSemester,
    cancelSemester,
    logout,
    setRememberLogin,
  };
}
