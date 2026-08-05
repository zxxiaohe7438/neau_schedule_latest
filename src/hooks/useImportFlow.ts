import { useState, useCallback, useRef } from 'react';
import type { ImportResult } from '../domain/ImportResult';
import type { Semester } from '../domain/Semester';

interface UseImportFlowOptions {
  /** 打开导入预览视图 */
  onOpenPreview: () => void;
  /** 关闭导入预览视图 */
  onClosePreview: () => void;
  /** 导入确认成功后回调（参数为导入目标学期，含同步后的日期） */
  onImported: (semester: Semester | null) => void;
}

/**
 * 导入状态机（JSON 文件 / 智能粘贴 → 预览 → 确认写入）。
 * 收敛了原 App.tsx 中的导入相关状态与回调。
 */
export function useImportFlow({ onOpenPreview, onClosePreview, onImported }: UseImportFlowOptions) {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await window.api.import.importJson(data);
      setImportResult(result);
      onOpenPreview();
    } catch (err) {
      alert(err instanceof Error ? err.message : '导入失败');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onOpenPreview]);

  const confirmImport = useCallback(
    async (updatedResult: ImportResult, options?: { overwrite?: boolean }) => {
      try {
        await window.api.import.confirmImport(updatedResult, options);
        setImportResult(null);
        onClosePreview();
        // Reload semester list and find the semester we just imported to
        const list = await window.api.semester.list();
        const importedSemester = list.find((s) => s.name === updatedResult.semester.name);
        onImported(importedSemester ?? null);
      } catch (err) {
        alert(err instanceof Error ? err.message : '导入确认失败');
      }
    },
    [onClosePreview, onImported]
  );

  const cancelImport = useCallback(() => {
    setImportResult(null);
    onClosePreview();
  }, [onClosePreview]);

  /** 智能粘贴确认（进入同一导入预览） */
  const handleSmartPasteConfirm = useCallback(
    (result: ImportResult) => {
      setImportResult(result);
      onOpenPreview();
    },
    [onOpenPreview]
  );

  return {
    importResult,
    fileInputRef,
    handleImportClick,
    handleFileChange,
    confirmImport,
    cancelImport,
    handleSmartPasteConfirm,
  };
}
