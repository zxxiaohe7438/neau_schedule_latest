import { ipcMain } from 'electron';
import { createSemesterRepo } from '../../src/db/repositories/semesterRepo';
import { createSectionTimeRepo } from '../../src/db/repositories/sectionTimeRepo';
import { DEFAULT_SECTION_TIMES } from '../../src/domain/SectionTime';

export function registerSemesterIpc(): void {
  const repo = createSemesterRepo();
  const sectionTimeRepo = createSectionTimeRepo();

  ipcMain.handle('semester:list', () => {
    return repo.list();
  });

  ipcMain.handle('semester:getById', (_event, id: number) => {
    return repo.getById(id);
  });

  ipcMain.handle('semester:create', (_event, input) => {
    const semester = repo.create(input);
    // Initialize default section times for new semester
    sectionTimeRepo.upsertBatch(semester.id, DEFAULT_SECTION_TIMES);
    return semester;
  });

  ipcMain.handle('semester:update', (_event, id: number, input) => {
    return repo.update(id, input);
  });

  ipcMain.handle('semester:delete', (_event, id: number) => {
    return repo.delete(id);
  });

  ipcMain.handle('semester:archive', (_event, id: number) => {
    return repo.archive(id);
  });
}
