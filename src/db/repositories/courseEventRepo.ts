import type {
  CourseEvent,
  CourseEventCreateInput,
  CourseEventUpdateInput,
} from '../../domain/CourseEvent';
import { queryAll, queryOne, execute } from '../connection';
import { buildUpdateClause } from '../updateHelper';

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
      const upd = buildUpdateClause(
        [
          ['weekday', input.weekday],
          ['start_section', input.start_section],
          ['end_section', input.end_section],
          ['start_week', input.start_week],
          ['end_week', input.end_week],
          ['week_pattern', input.week_pattern],
          ['location', input.location],
          ['note', input.note],
        ],
        ["updated_manually = 1", "updated_at = datetime('now')"]
      );
      if (!upd) return this.getById(id)!;

      execute(`UPDATE course_events SET ${upd.clause} WHERE id = ?`, [...upd.values, id]);
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

    /**
     * 按"时间格子"查找同一学期内时间重叠的事件（用于同格冲突检测）。
     * 节次区间与周次区间均相交即视为重叠；单双周模式在调用方另行判断。
     */
    findBySlotAndSemester(
      semesterId: number,
      slot: {
        weekday: number;
        start_section: number;
        end_section: number;
        start_week: number;
        end_week: number;
      }
    ): CourseEvent[] {
      return queryAll<CourseEvent>(
        `SELECT ce.* FROM course_events ce
         JOIN courses c ON ce.course_id = c.id
         WHERE c.semester_id = ?
           AND ce.weekday = ?
           AND ce.start_section <= ? AND ce.end_section >= ?
           AND ce.start_week <= ? AND ce.end_week >= ?`,
        [
          semesterId,
          slot.weekday,
          slot.end_section,
          slot.start_section,
          slot.end_week,
          slot.start_week,
        ]
      );
    },
  };
}

export type CourseEventRepo = ReturnType<typeof createCourseEventRepo>;
