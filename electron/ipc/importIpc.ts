import { ipcMain } from 'electron';
import type { ImportResult, ImportConflict } from '../../src/domain/ImportResult';
import { importJson } from '../../src/importers/jsonImporter';
import { importHtml } from '../../src/importers/htmlImporter';
import { importClipboard } from '../../src/importers/clipboardImporter';
import { importXlsx } from '../../src/importers/xlsxImporter';
import { recognizeText } from '../../src/importers/textRecognizer';
import { createSemesterRepo } from '../../src/db/repositories/semesterRepo';
import { createCourseRepo } from '../../src/db/repositories/courseRepo';
import { createCourseEventRepo } from '../../src/db/repositories/courseEventRepo';
import { createSectionTimeRepo } from '../../src/db/repositories/sectionTimeRepo';
import { DEFAULT_SECTION_TIMES } from '../../src/domain/SectionTime';
import { getCourseColor } from '../../src/utils/courseColor';

/**
 * Check for duplicates and conflicts in import result.
 */
function checkDuplicatesAndConflicts(
  result: ImportResult,
  courseEventRepo: ReturnType<typeof createCourseEventRepo>,
  semesterId?: number
): void {
  for (const item of result.courses) {
    let existing;
    if (semesterId) {
      existing = courseEventRepo.findBySourceHashAndSemester(item.source_hash, semesterId);
    } else {
      existing = courseEventRepo.findBySourceHash(item.source_hash);
    }
    if (existing) {
      // Check if manually updated
      if (existing.updated_manually) {
        item.has_conflict = true;
        const conflict: ImportConflict = {
          course_name: item.course_name,
          existing_event_id: existing.id,
          existing_location: existing.location,
          existing_note: existing.note,
          existing_updated_manually: true,
          new_location: item.event.location ?? '',
          new_note: item.event.note ?? '',
        };
        result.conflicts.push(conflict);
      } else {
        item.is_duplicate = true;
      }
    }
  }
}

export function registerImportIpc(): void {
  const semesterRepo = createSemesterRepo();
  const courseRepo = createCourseRepo();
  const courseEventRepo = createCourseEventRepo();
  const sectionTimeRepo = createSectionTimeRepo();

  ipcMain.handle('import:json', (_event, data: unknown): ImportResult => {
    const result = importJson(data);
    checkDuplicatesAndConflicts(result, courseEventRepo);
    return result;
  });

  ipcMain.handle('import:html', (_event, html: string): ImportResult => {
    const result = importHtml(html);
    checkDuplicatesAndConflicts(result, courseEventRepo);
    return result;
  });

  ipcMain.handle('import:clipboard', (_event, text: string): ImportResult => {
    const result = importClipboard(text);
    checkDuplicatesAndConflicts(result, courseEventRepo);
    return result;
  });

  ipcMain.handle('import:xlsx', (_event, buffer: ArrayBuffer): ImportResult => {
    const result = importXlsx(buffer);
    checkDuplicatesAndConflicts(result, courseEventRepo);
    return result;
  });

  ipcMain.handle('import:recognizeText', (_event, text: string): ImportResult => {
    const result = recognizeText(text);
    checkDuplicatesAndConflicts(result, courseEventRepo);
    return result;
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
      // Initialize default section times for new semester
      sectionTimeRepo.upsertBatch(semester.id, DEFAULT_SECTION_TIMES);
    }

    // Track created courses by name to avoid duplicates
    const courseMap = new Map<string, number>();

    // Import courses and events
    for (const item of courses) {
      // Skip duplicates
      if (item.is_duplicate) continue;

      // Skip conflicts (user chose to skip)
      if (item.has_conflict && item.conflict_resolution === 'skip') continue;

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
          const color = getCourseColor(item.course_name);

          const course = courseRepo.create({
            semester_id: semester.id,
            name: item.course_name,
            teacher: item.teacher,
            color,
          });
          courseId = course.id;
        }
        courseMap.set(item.course_name, courseId);
      }

      // Handle conflict resolution
      if (item.has_conflict && item.conflict_resolution === 'overwrite') {
        // Update existing event
        const existing = courseEventRepo.findBySourceHash(item.source_hash);
        if (existing) {
          courseEventRepo.update(existing.id, {
            location: item.event.location,
            note: item.event.note,
            weekday: item.event.weekday,
            start_section: item.event.start_section,
            end_section: item.event.end_section,
            start_week: item.event.start_week,
            end_week: item.event.end_week,
            week_pattern: item.event.week_pattern,
          });
        }
      } else {
        // Create new course event
        courseEventRepo.create({
          ...item.event,
          course_id: courseId,
        });
      }
    }

    // Import unscheduled courses (courses without fixed schedule)
    const { unscheduled_courses } = result;
    if (unscheduled_courses) {
      for (const item of unscheduled_courses) {
        // Check if course already exists
        const existingCourses = courseRepo.listBySemester(semester.id);
        const existing = existingCourses.find((c) => c.name === item.course_name);
        if (!existing) {
          const color = getCourseColor(item.course_name);
          courseRepo.create({
            semester_id: semester.id,
            course_number: item.course_number,
            name: item.course_name,
            teacher: item.teacher,
            color,
            units: item.units,
          });
        }
      }
    }
  });
}
