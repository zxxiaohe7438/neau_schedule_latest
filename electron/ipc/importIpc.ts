import { ipcMain } from 'electron';
import type { ImportResult } from '../../src/domain/ImportResult';

// Placeholder - will be implemented with actual importers
export function registerImportIpc(): void {
  ipcMain.handle('import:json', (_event, _data: unknown): ImportResult => {
    // TODO: implement jsonImporter
    throw new Error('JSON importer not yet implemented');
  });

  ipcMain.handle('import:html', (_event, _html: string): ImportResult => {
    // TODO: implement htmlImporter
    throw new Error('HTML importer not yet implemented');
  });

  ipcMain.handle('import:clipboard', (_event, _text: string): ImportResult => {
    // TODO: implement clipboardImporter
    throw new Error('Clipboard importer not yet implemented');
  });

  ipcMain.handle('import:xlsx', (_event, _buffer: ArrayBuffer): ImportResult => {
    // TODO: implement xlsxImporter
    throw new Error('XLSX importer not yet implemented');
  });

  ipcMain.handle('import:confirm', (_event, _result: ImportResult): void => {
    // TODO: implement confirm logic
    throw new Error('Import confirm not yet implemented');
  });
}
