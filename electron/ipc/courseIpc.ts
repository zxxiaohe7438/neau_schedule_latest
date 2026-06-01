import { ipcMain } from 'electron';
import { createCourseRepo } from '../../src/db/repositories/courseRepo';
import { COURSE_COLORS } from '../../src/domain/Course';

export function registerCourseIpc(): void {
  const repo = createCourseRepo();

  ipcMain.handle('course:listBySemester', (_event, semesterId: number) => {
    return repo.listBySemester(semesterId);
  });

  ipcMain.handle('course:getById', (_event, id: number) => {
    return repo.getById(id);
  });

  ipcMain.handle('course:create', (_event, input) => {
    // Auto-assign color if not specified
    if (!input.color) {
      const existing = repo.listBySemester(input.semester_id);
      const usedColors = new Set(existing.map((c) => c.color));
      const available = COURSE_COLORS.find((c) => !usedColors.has(c));
      input.color = available ?? COURSE_COLORS[existing.length % COURSE_COLORS.length];
    }
    return repo.create(input);
  });

  ipcMain.handle('course:update', (_event, id: number, input) => {
    return repo.update(id, input);
  });

  ipcMain.handle('course:delete', (_event, id: number) => {
    return repo.delete(id);
  });
}
