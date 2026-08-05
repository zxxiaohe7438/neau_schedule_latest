/**
 * Development-only IPC handlers for seed data.
 * These handlers are only registered in development mode.
 */

import { ipcMain } from 'electron';
import { createCourseRepo } from '../../src/db/repositories/courseRepo';
import { createCourseEventRepo } from '../../src/db/repositories/courseEventRepo';
import {
  MOCK_SEMESTER,
  MOCK_COURSES,
  generateMockEvents,
} from '../../src/db/seed';
import { createSemesterWithDefaultTimes } from './semesterHelper';

export function registerDevIpc(): void {
  const courseRepo = createCourseRepo();
  const courseEventRepo = createCourseEventRepo();

  /**
   * Seed the database with mock data for development.
   * Returns the created semester.
   */
  ipcMain.handle('dev:seed', () => {
    // Create semester with default section times
    const semester = createSemesterWithDefaultTimes({
      name: MOCK_SEMESTER.name,
      start_date: MOCK_SEMESTER.start_date,
      weeks_count: MOCK_SEMESTER.weeks_count,
    });

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
}
