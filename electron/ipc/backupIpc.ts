import { ipcMain, dialog, app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { BackupData } from '../../src/domain/BackupData';
import type { Semester } from '../../src/domain/Semester';
import { createSemesterRepo } from '../../src/db/repositories/semesterRepo';
import { createSectionTimeRepo } from '../../src/db/repositories/sectionTimeRepo';
import { createCourseRepo } from '../../src/db/repositories/courseRepo';
import { createCourseEventRepo } from '../../src/db/repositories/courseEventRepo';
import { createSemesterWithDefaultTimes } from './semesterHelper';

function getBackupDir(): string {
  const userDataPath = app.getPath('userData');
  const backupDir = path.join(userDataPath, 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

function generateBackupFilename(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
  return `neau-schedule-backup-${date}-${time}.json`;
}

interface BackupRepos {
  sectionTimeRepo: ReturnType<typeof createSectionTimeRepo>;
  courseRepo: ReturnType<typeof createCourseRepo>;
  courseEventRepo: ReturnType<typeof createCourseEventRepo>;
}

function buildBackupData(semester: Semester, semesterId: number, repos: BackupRepos): BackupData {
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    semester,
    section_times: repos.sectionTimeRepo.listBySemester(semesterId),
    courses: repos.courseRepo.listBySemester(semesterId),
    course_events: repos.courseEventRepo.listBySemester(semesterId),
  };
}

export function registerBackupIpc(): void {
  const semesterRepo = createSemesterRepo();
  const sectionTimeRepo = createSectionTimeRepo();
  const courseRepo = createCourseRepo();
  const courseEventRepo = createCourseEventRepo();
  const repos: BackupRepos = { sectionTimeRepo, courseRepo, courseEventRepo };

  ipcMain.handle('backup:exportTo', async (_event, semesterId: number): Promise<string | null> => {
    const semester = semesterRepo.getById(semesterId);
    if (!semester) throw new Error(`Semester ${semesterId} not found`);

    const backupData = buildBackupData(semester, semesterId, repos);

    const result = await dialog.showSaveDialog({
      title: '导出备份',
      defaultPath: generateBackupFilename(),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) return null;

    fs.writeFileSync(result.filePath, JSON.stringify(backupData, null, 2), 'utf-8');

    return result.filePath;
  });

  ipcMain.handle('backup:autoBackup', (_event): string => {
    // Create auto backup of all semesters
    const semesters = semesterRepo.list();
    const allBackupData = {
      version: 1,
      exported_at: new Date().toISOString(),
      semesters: semesters.map((semester) =>
        buildBackupData(semester, semester.id, repos)
      ),
    };

    const backupDir = getBackupDir();
    const filename = `auto-backup-${new Date().toISOString().split('T')[0]}.json`;
    const filePath = path.join(backupDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(allBackupData, null, 2), 'utf-8');

    return filePath;
  });

  ipcMain.handle('backup:import', async (_event, data?: BackupData): Promise<{ success: boolean; message: string }> => {
    try {
      let backupData: BackupData;

      if (data) {
        backupData = data;
      } else {
        // Open file dialog
        const result = await dialog.showOpenDialog({
          title: '选择备份文件',
          filters: [{ name: 'JSON', extensions: ['json'] }],
          properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, message: '已取消' };
        }

        const fileContent = fs.readFileSync(result.filePaths[0], 'utf-8');
        backupData = JSON.parse(fileContent);
      }

      // Validate backup version
      if (!backupData.version || backupData.version !== 1) {
        return { success: false, message: '备份版本不支持' };
      }

      // Create semester (always new, never overwrites existing data)
      const semester = createSemesterWithDefaultTimes({
        name: backupData.semester.name,
        start_date: backupData.semester.start_date,
        weeks_count: backupData.semester.weeks_count,
      });

      // Restore section times
      sectionTimeRepo.upsertBatch(semester.id, backupData.section_times);

      // Restore courses and events
      for (const course of backupData.courses) {
        const newCourse = courseRepo.create({
          semester_id: semester.id,
          name: course.name,
          teacher: course.teacher,
          color: course.color,
        });

        const events = backupData.course_events.filter((e) => e.course_id === course.id);
        for (const event of events) {
          courseEventRepo.create({
            course_id: newCourse.id,
            weekday: event.weekday,
            start_section: event.start_section,
            end_section: event.end_section,
            start_week: event.start_week,
            end_week: event.end_week,
            week_pattern: event.week_pattern,
            location: event.location,
            note: event.note,
            source_hash: event.source_hash,
          });
        }
      }

      return { success: true, message: '恢复成功' };
    } catch (err) {
      return {
        success: false,
        message: `恢复失败: ${err instanceof Error ? err.message : '未知错误'}`,
      };
    }
  });
}
