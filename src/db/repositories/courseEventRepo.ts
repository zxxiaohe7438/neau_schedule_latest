import type {
  CourseEvent,
  CourseEventCreateInput,
  CourseEventUpdateInput,
} from '../../domain/CourseEvent';
import { queryAll, queryOne, execute } from '../connection';

export function createCourseEventRepo() {
  return {
    listBySemester(semesterId: number): CourseEvent[] {
      return queryAll<CourseEvent>(
        `SELECT ce.* FROM course_events ce
         JOIN courses c ON ce.course_id = c.id
         WHERE c.semester_id = ?
         ORDER BY ce.weekday, ce.start_section`,
        [semesterId]
      );
    },

    listByCourse(courseId: number): CourseEvent[] {
      return queryAll<CourseEvent>(
        'SELECT * FROM course_events WHERE course_id = ? ORDER BY weekday, start_section',
        [courseId]
      );
    },

    getById(id: number): CourseEvent | undefined {
      return queryOne<CourseEvent>('SELECT * FROM course_events WHERE id = ?', [id]);
    },

    create(input: CourseEventCreateInput): CourseEvent {
      const result = execute(
        `INSERT INTO course_events
         (course_id, weekday, start_section, end_section, start_week, end_week, week_pattern, location, note, source_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.course_id,
          input.weekday,
          input.start_section,
          input.end_section,
          input.start_week,
          input.end_week,
          input.week_pattern,
          input.location ?? '',
          input.note ?? '',
          input.source_hash ?? '',
        ]
      );
      return this.getById(result.lastInsertRowid)!;
    },

    update(id: number, input: CourseEventUpdateInput): CourseEvent {
      const fields: string[] = [];
      const values: unknown[] = [];

      if (input.weekday !== undefined) {
        fields.push('weekday = ?');
        values.push(input.weekday);
      }
      if (input.start_section !== undefined) {
        fields.push('start_section = ?');
        values.push(input.start_section);
      }
      if (input.end_section !== undefined) {
        fields.push('end_section = ?');
        values.push(input.end_section);
      }
      if (input.start_week !== undefined) {
        fields.push('start_week = ?');
        values.push(input.start_week);
      }
      if (input.end_week !== undefined) {
        fields.push('end_week = ?');
        values.push(input.end_week);
      }
      if (input.week_pattern !== undefined) {
        fields.push('week_pattern = ?');
        values.push(input.week_pattern);
      }
      if (input.location !== undefined) {
        fields.push('location = ?');
        values.push(input.location);
      }
      if (input.note !== undefined) {
        fields.push('note = ?');
        values.push(input.note);
      }

      if (fields.length === 0) return this.getById(id)!;

      // Mark as manually updated
      fields.push('updated_manually = 1');
      fields.push("updated_at = datetime('now')");
      values.push(id);

      execute(`UPDATE course_events SET ${fields.join(', ')} WHERE id = ?`, values);
      return this.getById(id)!;
    },

    delete(id: number): void {
      execute('DELETE FROM course_events WHERE id = ?', [id]);
    },

    findBySourceHash(sourceHash: string): CourseEvent | undefined {
      return queryOne<CourseEvent>(
        'SELECT * FROM course_events WHERE source_hash = ?',
        [sourceHash]
      );
    },

    findBySourceHashAndSemester(sourceHash: string, semesterId: number): CourseEvent | undefined {
      return queryOne<CourseEvent>(
        `SELECT ce.* FROM course_events ce
         JOIN courses c ON ce.course_id = c.id
         WHERE ce.source_hash = ? AND c.semester_id = ?`,
        [sourceHash, semesterId]
      );
    },
  };
}

export type CourseEventRepo = ReturnType<typeof createCourseEventRepo>;
