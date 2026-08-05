import type { Course, CourseCreateInput, CourseUpdateInput } from '../../domain/Course';
import { queryAll, queryOne, execute } from '../connection';
import { buildUpdateClause } from '../updateHelper';

export function createCourseRepo() {
  return {
    listBySemester(semesterId: number): Course[] {
      return queryAll<Course>(
        'SELECT * FROM courses WHERE semester_id = ? ORDER BY created_at',
        [semesterId]
      );
    },

    getById(id: number): Course | undefined {
      return queryOne<Course>('SELECT * FROM courses WHERE id = ?', [id]);
    },

    create(input: CourseCreateInput): Course {
      const result = execute(
        'INSERT INTO courses (semester_id, course_number, name, teacher, color, units) VALUES (?, ?, ?, ?, ?, ?)',
        [
          input.semester_id,
          input.course_number ?? '',
          input.name,
          input.teacher ?? '',
          input.color ?? '#4A90D9',
          input.units ?? 0,
        ]
      );
      return this.getById(result.lastInsertRowid)!;
    },

    update(id: number, input: CourseUpdateInput): Course {
      const upd = buildUpdateClause(
        [
          ['course_number', input.course_number],
          ['name', input.name],
          ['teacher', input.teacher],
          ['color', input.color],
          ['units', input.units],
        ],
        ["updated_at = datetime('now')"]
      );
      if (!upd) return this.getById(id)!;

      execute(`UPDATE courses SET ${upd.clause} WHERE id = ?`, [...upd.values, id]);
      return this.getById(id)!;
    },

    delete(id: number): void {
      execute('DELETE FROM courses WHERE id = ?', [id]);
    },

    /** 清空某学期全部课程（course_events 经外键 CASCADE 一并删除） */
    deleteBySemester(semesterId: number): void {
      execute('DELETE FROM courses WHERE semester_id = ?', [semesterId]);
    },
  };
}

export type CourseRepo = ReturnType<typeof createCourseRepo>;
