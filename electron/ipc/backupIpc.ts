import { ipcMain } from 'electron';
import type { BackupData } from '../../src/domain/BackupData';
import { createSemesterRepo } from '../../src/db/repositories/semesterRepo';
import { createSectionTimeRepo } from '../../src/db/repositories/sectionTimeRepo';
import { createCourseRepo } from '../../src/db/repositories/courseRepo';
import { createCourseEventRepo } from '../../src/db/repositories/courseEventRepo';

export function registerBackupIpc(): void {
  const semesterRepo = createSemesterRepo();
  const sectionTimeRepo = createSectionTimeRepo();
  const courseRepo = createCourseRepo();
  const courseEventRepo = createCourseEventRepo();

  ipcMain.handle('backup:export', (_event, semesterId: number): BackupData => {
    const semester = semesterRepo.getById(semesterId);
    if (!semester) throw new Error(`Semester ${semesterId} not found`);

    return {
      version: 1,
      exported_at: new Date().toISOString(),
      semester,
      section_times: sectionTimeRepo.listBySemester(semesterId),
      courses: courseRepo.listBySemester(semesterId),
      course_events: courseEventRepo.listBySemester(semesterId),
    };
  });

  ipcMain.handle('backup:import', (_event, data: BackupData): void => {
    // Create semester
    const semester = semesterRepo.create({
      name: data.semester.name,
      start_date: data.semester.start_date,
      weeks_count: data.semester.weeks_count,
    });

    // Restore section times
    sectionTimeRepo.upsertBatch(semester.id, data.section_times);

    // Restore courses and events
    for (const course of data.courses) {
      const newCourse = courseRepo.create({
        semester_id: semester.id,
        name: course.name,
        teacher: course.teacher,
        color: course.color,
      });

      const events = data.course_events.filter((e) => e.course_id === course.id);
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
  });
}
