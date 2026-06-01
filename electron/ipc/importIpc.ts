import { ipcMain } from 'electron';
import type { ImportResult } from '../../src/domain/ImportResult';
import { importJson } from '../../src/importers/jsonImporter';
import { createSemesterRepo } from '../../src/db/repositories/semesterRepo';
import { createCourseRepo } from '../../src/db/repositories/courseRepo';
import { createCourseEventRepo } from '../../src/db/repositories/courseEventRepo';
import { getCourseColor } from '../../src/utils/courseColor';

export function registerImportIpc(): void {
  const semesterRepo = createSemesterRepo();
  const courseRepo = createCourseRepo();
  const courseEventRepo = createCourseEventRepo();

  ipcMain.handle('import:json', (_event, data: unknown): ImportResult => {
    const result = importJson(data);

    // Check for duplicates against existing data
    for (const item of result.courses) {
      const existing = courseEventRepo.findBySourceHash(item.source_hash);
      if (existing) {
        item.is_duplicate = true;
      }
    }

    return result;
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

  ipcMain.handle('import:confirm', (_event, result: ImportResult): void => {
    const { semester: semesterData, courses } = result;

    // Find or create semester
    let semester = semesterRepo.list().find((s) => s.name === semesterData.name);
    if (!semester) {
      semester = semesterRepo.create({
        name: semesterData.name,
        start_date: semesterData.start_date,
        weeks_count: semesterData.weeks_count,
      });
    }

    // Track created courses by name to avoid duplicates
    const courseMap = new Map<string, number>();

    // Import courses and events
    for (const item of courses) {
      // Skip duplicates
      if (item.is_duplicate) continue;

      // Skip items with conflicts (user should resolve)
      if (item.has_conflict) continue;

      // Get or create course
      let courseId = courseMap.get(item.course_name);
      if (!courseId) {
        // Check if course already exists in database
        const existingCourses = courseRepo.listBySemester(semester.id);
        const existing = existingCourses.find((c) => c.name === item.course_name);

        if (existing) {
          courseId = existing.id;
        } else {
          // Assign color based on course name
          const usedColors = new Set(existingCourses.map((c) => c.color));
          const color = getCourseColor(item.course_name);

          const course = courseRepo.create({
            semester_id: semester.id,
            name: item.course_name,
            teacher: item.teacher,
            color: usedColors.has(color) ? color : color,
          });
          courseId = course.id;
        }
        courseMap.set(item.course_name, courseId);
      }

      // Create course event
      courseEventRepo.create({
        ...item.event,
        course_id: courseId,
      });
    }
  });
}
