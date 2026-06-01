/**
 * Development-only IPC handlers for seed data.
 * These handlers are only registered in development mode.
 */

import { ipcMain } from 'electron';
import { createSemesterRepo } from '../../src/db/repositories/semesterRepo';
import { createCourseRepo } from '../../src/db/repositories/courseRepo';
import { createCourseEventRepo } from '../../src/db/repositories/courseEventRepo';
import { createSectionTimeRepo } from '../../src/db/repositories/sectionTimeRepo';
import {
  MOCK_SEMESTER,
  MOCK_COURSES,
  DEFAULT_SECTION_TIMES,
  generateMockEvents,
} from '../../src/db/seed';

export function registerDevIpc(): void {
  const semesterRepo = createSemesterRepo();
  const courseRepo = createCourseRepo();
  const courseEventRepo = createCourseEventRepo();
  const sectionTimeRepo = createSectionTimeRepo();

  /**
   * Seed the database with mock data for development.
   * Returns the created semester.
   */
  ipcMain.handle('dev:seed', () => {
    // Create semester
    const semester = semesterRepo.create({
      name: MOCK_SEMESTER.name,
      start_date: MOCK_SEMESTER.start_date,
      weeks_count: MOCK_SEMESTER.weeks_count,
    });

    // Create section times
    sectionTimeRepo.upsertBatch(semester.id, DEFAULT_SECTION_TIMES);

    // Create courses
    const courseIds: number[] = [];
    for (const courseData of MOCK_COURSES) {
      const course = courseRepo.create({
        semester_id: semester.id,
        name: courseData.name,
        teacher: courseData.teacher,
        color: courseData.color,
      });
      courseIds.push(course.id);
    }

    // Create course events
    const events = generateMockEvents(courseIds);
    for (const eventData of events) {
      courseEventRepo.create(eventData);
    }

    return semester;
  });

  /**
   * Clear all data from the database.
   * Use with caution!
   */
  ipcMain.handle('dev:clearAll', () => {
    // Delete in correct order to respect foreign keys
    const semesters = semesterRepo.list();
    for (const semester of semesters) {
      semesterRepo.delete(semester.id);
    }
    return { success: true };
  });
}
