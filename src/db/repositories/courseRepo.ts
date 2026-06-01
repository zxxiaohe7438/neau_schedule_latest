import type { Course, CourseCreateInput, CourseUpdateInput } from '../../domain/Course';
import { queryAll, queryOne, execute } from '../connection';

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
      const fields: string[] = [];
      const values: unknown[] = [];

      if (input.course_number !== undefined) {
        fields.push('course_number = ?');
        values.push(input.course_number);
      }
      if (input.name !== undefined) {
        fields.push('name = ?');
        values.push(input.name);
      }
      if (input.teacher !== undefined) {
        fields.push('teacher = ?');
        values.push(input.teacher);
      }
      if (input.color !== undefined) {
        fields.push('color = ?');
        values.push(input.color);
      }
      if (input.units !== undefined) {
        fields.push('units = ?');
        values.push(input.units);
      }

      if (fields.length === 0) return this.getById(id)!;

      fields.push("updated_at = datetime('now')");
      values.push(id);

      execute(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`, values);
      return this.getById(id)!;
    },

    delete(id: number): void {
      execute('DELETE FROM courses WHERE id = ?', [id]);
    },
  };
}

export type CourseRepo = ReturnType<typeof createCourseRepo>;
