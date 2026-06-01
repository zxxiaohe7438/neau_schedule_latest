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
        'INSERT INTO courses (semester_id, name, teacher, color) VALUES (?, ?, ?, ?)',
        [input.semester_id, input.name, input.teacher ?? '', input.color ?? '#4A90D9']
      );
      return this.getById(result.lastInsertRowid)!;
    },

    update(id: number, input: CourseUpdateInput): Course {
      const fields: string[] = [];
      const values: unknown[] = [];

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
