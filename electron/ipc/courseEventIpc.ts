import { ipcMain } from 'electron';
import { createCourseEventRepo } from '../../src/db/repositories/courseEventRepo';

export function registerCourseEventIpc(): void {
  const repo = createCourseEventRepo();

  ipcMain.handle('courseEvent:listBySemester', (_event, semesterId: number) => {
    return repo.listBySemester(semesterId);
  });

  ipcMain.handle('courseEvent:listByCourse', (_event, courseId: number) => {
    return repo.listByCourse(courseId);
  });

  ipcMain.handle('courseEvent:getById', (_event, id: number) => {
    return repo.getById(id);
  });

  ipcMain.handle('courseEvent:create', (_event, input) => {
    return repo.create(input);
  });

  ipcMain.handle('courseEvent:update', (_event, id: number, input) => {
    return repo.update(id, input);
  });

  ipcMain.handle('courseEvent:delete', (_event, id: number) => {
    return repo.delete(id);
  });
}
