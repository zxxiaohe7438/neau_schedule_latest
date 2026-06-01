import { ipcMain } from 'electron';
import { createSectionTimeRepo } from '../../src/db/repositories/sectionTimeRepo';
import { DEFAULT_SECTION_TIMES } from '../../src/domain/SectionTime';

export function registerSectionTimeIpc(): void {
  const repo = createSectionTimeRepo();

  ipcMain.handle('sectionTime:listBySemester', (_event, semesterId: number) => {
    return repo.listBySemester(semesterId);
  });

  ipcMain.handle('sectionTime:upsertBatch', (_event, semesterId: number, times) => {
    return repo.upsertBatch(semesterId, times);
  });

  ipcMain.handle('sectionTime:initDefaults', (_event, semesterId: number) => {
    return repo.upsertBatch(semesterId, DEFAULT_SECTION_TIMES);
  });
}
