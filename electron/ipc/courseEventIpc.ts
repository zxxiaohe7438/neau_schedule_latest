import { ipcMain } from 'electron';
import { createCourseEventRepo } from '../../src/db/repositories/courseEventRepo';

export function registerCourseEventIpc(): void {
  const repo = createCourseEventRepo();

  ipcMain.handle('courseEvent:listBySemester', (_event, semesterId: number) => {
    return repo.listBySemester(semesterId);
  });

  ipcMain.handle('courseEvent:update', (_event, id: number, input) => {
    const updated = repo.update(id, input);
    if (!updated) {
      // 同 course:update：目标事件不存在时返回 null 而非 undefined
      console.error('courseEvent:update 目标事件不存在, id =', id, 'input =', JSON.stringify(input));
    }
    return updated ?? null;
  });

  ipcMain.handle('courseEvent:delete', (_event, id: number) => {
    return repo.delete(id);
  });
}
