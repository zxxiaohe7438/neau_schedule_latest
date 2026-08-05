import { ipcMain } from 'electron';
import { createCourseRepo } from '../../src/db/repositories/courseRepo';

export function registerCourseIpc(): void {
  const repo = createCourseRepo();

  ipcMain.handle('course:listBySemester', (_event, semesterId: number) => {
    return repo.listBySemester(semesterId);
  });

  ipcMain.handle('course:update', (_event, id: number, input) => {
    const updated = repo.update(id, input);
    if (!updated) {
      // 目标课程不存在（如已被删除）：返回 null 而非 undefined，避免
      // Electron 序列化 undefined 报 "Wrong API use: tried to bind a value of an unknown type"
      console.error('course:update 目标课程不存在, id =', id, 'input =', JSON.stringify(input));
    }
    return updated ?? null;
  });

  ipcMain.handle('course:delete', (_event, id: number) => {
    return repo.delete(id);
  });
}
