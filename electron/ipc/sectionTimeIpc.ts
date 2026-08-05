import { ipcMain } from 'electron';
import { createSectionTimeRepo } from '../../src/db/repositories/sectionTimeRepo';

export function registerSectionTimeIpc(): void {
  const repo = createSectionTimeRepo();

  ipcMain.handle('sectionTime:listBySemester', (_event, semesterId: number) => {
    return repo.listBySemester(semesterId);
  });
}
