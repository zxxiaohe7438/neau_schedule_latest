import { contextBridge, ipcRenderer } from 'electron';
import type {
  Semester,
  SemesterCreateInput,
  SemesterUpdateInput,
} from '../src/domain/Semester';
import type {
  SectionTime,
  SectionTimeCreateInput,
} from '../src/domain/SectionTime';
import type {
  Course,
  CourseCreateInput,
  CourseUpdateInput,
} from '../src/domain/Course';
import type {
  CourseEvent,
  CourseEventCreateInput,
  CourseEventUpdateInput,
} from '../src/domain/CourseEvent';
import type { ImportResult } from '../src/domain/ImportResult';
import type { BackupData } from '../src/domain/BackupData';

export interface ElectronAPI {
  // Semester
  semester: {
    list: () => Promise<Semester[]>;
    getById: (id: number) => Promise<Semester | undefined>;
    create: (input: SemesterCreateInput) => Promise<Semester>;
    update: (id: number, input: SemesterUpdateInput) => Promise<Semester>;
    delete: (id: number) => Promise<void>;
    archive: (id: number) => Promise<void>;
  };
  // Section Time
  sectionTime: {
    listBySemester: (semesterId: number) => Promise<SectionTime[]>;
    upsertBatch: (semesterId: number, times: SectionTimeCreateInput[]) => Promise<SectionTime[]>;
    initDefaults: (semesterId: number) => Promise<SectionTime[]>;
  };
  // Course
  course: {
    listBySemester: (semesterId: number) => Promise<Course[]>;
    getById: (id: number) => Promise<Course | undefined>;
    create: (input: CourseCreateInput) => Promise<Course>;
    update: (id: number, input: CourseUpdateInput) => Promise<Course>;
    delete: (id: number) => Promise<void>;
  };
  // Course Event
  courseEvent: {
    listBySemester: (semesterId: number) => Promise<CourseEvent[]>;
    listByCourse: (courseId: number) => Promise<CourseEvent[]>;
    getById: (id: number) => Promise<CourseEvent | undefined>;
    create: (input: CourseEventCreateInput) => Promise<CourseEvent>;
    update: (id: number, input: CourseEventUpdateInput) => Promise<CourseEvent>;
    delete: (id: number) => Promise<void>;
  };
  // Import
  import: {
    importJson: (data: unknown) => Promise<ImportResult>;
    importHtml: (html: string) => Promise<ImportResult>;
    importClipboard: (text: string) => Promise<ImportResult>;
    importXlsx: (buffer: ArrayBuffer) => Promise<ImportResult>;
    confirmImport: (result: ImportResult) => Promise<void>;
  };
  // Backup
  backup: {
    exportJson: (semesterId: number) => Promise<BackupData>;
    importJson: (data: BackupData) => Promise<void>;
  };
  // Development only
  dev?: {
    seed: () => Promise<Semester>;
    clearAll: () => Promise<{ success: boolean }>;
  };
}

const api: ElectronAPI = {
  semester: {
    list: () => ipcRenderer.invoke('semester:list'),
    getById: (id) => ipcRenderer.invoke('semester:getById', id),
    create: (input) => ipcRenderer.invoke('semester:create', input),
    update: (id, input) => ipcRenderer.invoke('semester:update', id, input),
    delete: (id) => ipcRenderer.invoke('semester:delete', id),
    archive: (id) => ipcRenderer.invoke('semester:archive', id),
  },
  sectionTime: {
    listBySemester: (semesterId) =>
      ipcRenderer.invoke('sectionTime:listBySemester', semesterId),
    upsertBatch: (semesterId, times) =>
      ipcRenderer.invoke('sectionTime:upsertBatch', semesterId, times),
    initDefaults: (semesterId) =>
      ipcRenderer.invoke('sectionTime:initDefaults', semesterId),
  },
  course: {
    listBySemester: (semesterId) =>
      ipcRenderer.invoke('course:listBySemester', semesterId),
    getById: (id) => ipcRenderer.invoke('course:getById', id),
    create: (input) => ipcRenderer.invoke('course:create', input),
    update: (id, input) => ipcRenderer.invoke('course:update', id, input),
    delete: (id) => ipcRenderer.invoke('course:delete', id),
  },
  courseEvent: {
    listBySemester: (semesterId) =>
      ipcRenderer.invoke('courseEvent:listBySemester', semesterId),
    listByCourse: (courseId) =>
      ipcRenderer.invoke('courseEvent:listByCourse', courseId),
    getById: (id) => ipcRenderer.invoke('courseEvent:getById', id),
    create: (input) => ipcRenderer.invoke('courseEvent:create', input),
    update: (id, input) => ipcRenderer.invoke('courseEvent:update', id, input),
    delete: (id) => ipcRenderer.invoke('courseEvent:delete', id),
  },
  import: {
    importJson: (data) => ipcRenderer.invoke('import:json', data),
    importHtml: (html) => ipcRenderer.invoke('import:html', html),
    importClipboard: (text) => ipcRenderer.invoke('import:clipboard', text),
    importXlsx: (buffer) => ipcRenderer.invoke('import:xlsx', buffer),
    confirmImport: (result) => ipcRenderer.invoke('import:confirm', result),
  },
  backup: {
    exportJson: (semesterId) => ipcRenderer.invoke('backup:export', semesterId),
    importJson: (data) => ipcRenderer.invoke('backup:import', data),
  },
  dev: {
    seed: () => ipcRenderer.invoke('dev:seed'),
    clearAll: () => ipcRenderer.invoke('dev:clearAll'),
  },
};

contextBridge.exposeInMainWorld('api', api);
