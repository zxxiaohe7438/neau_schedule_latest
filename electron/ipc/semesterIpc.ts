import { ipcMain } from 'electron';
import { createSemesterRepo } from '../../src/db/repositories/semesterRepo';
import { createCourseRepo } from '../../src/db/repositories/courseRepo';
import { createCellAnnotationRepo } from '../../src/db/repositories/cellAnnotationRepo';
import { createSemesterWithDefaultTimes } from './semesterHelper';

export function registerSemesterIpc(): void {
  const repo = createSemesterRepo();
  const courseRepo = createCourseRepo();
  const cellAnnotationRepo = createCellAnnotationRepo();

  ipcMain.handle('semester:list', () => {
    return repo.list();
  });

  ipcMain.handle('semester:create', (_event, input) => {
    // 创建学期并初始化默认节次时间
    return createSemesterWithDefaultTimes(input);
  });

  ipcMain.handle('semester:delete', (_event, id: number) => {
    return repo.delete(id);
  });

  ipcMain.handle('semester:archive', (_event, id: number) => {
    return repo.archive(id);
  });

  ipcMain.handle('semester:unarchive', (_event, id: number) => {
    return repo.unarchive(id);
  });

  /** 清空某学期课表内容（课程/事件/格子备注），保留学期与节次时间 */
  ipcMain.handle('semester:clearSchedule', (_event, id: number): void => {
    // course_events 经外键 CASCADE 随课程一并删除
    courseRepo.deleteBySemester(id);
    cellAnnotationRepo.deleteBySemester(id);
  });

  /** 清空全部数据（删除所有学期，子表经 CASCADE 级联清空），不可恢复 */
  ipcMain.handle('semester:clearAll', (): { success: boolean } => {
    for (const semester of repo.list()) {
      repo.delete(semester.id);
    }
    return { success: true };
  });
}
