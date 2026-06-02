import { ipcMain } from 'electron';
import { createCellAnnotationRepo } from '../../src/db/repositories/cellAnnotationRepo';
import type {
  CellAnnotationCreateInput,
  CellAnnotationUpdateInput,
} from '../../src/domain/CellAnnotation';

export function registerCellAnnotationIpc(): void {
  const repo = createCellAnnotationRepo();

  ipcMain.handle('cellAnnotation:listBySemester', (_event, semesterId: number) => {
    return repo.listBySemester(semesterId);
  });

  ipcMain.handle('cellAnnotation:create', (_event, input: CellAnnotationCreateInput) => {
    return repo.create(input);
  });

  ipcMain.handle('cellAnnotation:update', (_event, id: number, input: CellAnnotationUpdateInput) => {
    return repo.update(id, input);
  });

  ipcMain.handle('cellAnnotation:delete', (_event, id: number) => {
    return repo.delete(id);
  });
}
