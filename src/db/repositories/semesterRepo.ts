import type { Semester, SemesterCreateInput, SemesterUpdateInput } from '../../domain/Semester';
import { queryAll, queryOne, execute } from '../connection';

export function createSemesterRepo() {
  return {
    list(): Semester[] {
      return queryAll<Semester>('SELECT * FROM semesters ORDER BY created_at DESC');
    },

    getById(id: number): Semester | undefined {
      return queryOne<Semester>('SELECT * FROM semesters WHERE id = ?', [id]);
    },

    create(input: SemesterCreateInput): Semester {
      const result = execute(
        'INSERT INTO semesters (name, start_date, weeks_count) VALUES (?, ?, ?)',
        [input.name, input.start_date, input.weeks_count]
      );
      return this.getById(result.lastInsertRowid)!;
    },

    update(id: number, input: SemesterUpdateInput): Semester {
      const fields: string[] = [];
      const values: unknown[] = [];

      if (input.name !== undefined) {
        fields.push('name = ?');
        values.push(input.name);
      }
      if (input.start_date !== undefined) {
        fields.push('start_date = ?');
        values.push(input.start_date);
      }
      if (input.weeks_count !== undefined) {
        fields.push('weeks_count = ?');
        values.push(input.weeks_count);
      }
      if (input.is_archived !== undefined) {
        fields.push('is_archived = ?');
        values.push(input.is_archived ? 1 : 0);
      }

      if (fields.length === 0) return this.getById(id)!;

      fields.push("updated_at = datetime('now')");
      values.push(id);

      execute(`UPDATE semesters SET ${fields.join(', ')} WHERE id = ?`, values);
      return this.getById(id)!;
    },

    delete(id: number): void {
      // Explicitly delete related data in correct order
      // Delete course events first (must be before courses)
      execute(
        'DELETE FROM course_events WHERE course_id IN (SELECT id FROM courses WHERE semester_id = ?)',
        [id]
      );
      // Delete courses
      execute('DELETE FROM courses WHERE semester_id = ?', [id]);
      // Delete section times
      execute('DELETE FROM section_times WHERE semester_id = ?', [id]);
      // Finally delete semester
      execute('DELETE FROM semesters WHERE id = ?', [id]);
    },

    archive(id: number): void {
      execute("UPDATE semesters SET is_archived = 1, updated_at = datetime('now') WHERE id = ?", [id]);
    },

    unarchive(id: number): void {
      execute("UPDATE semesters SET is_archived = 0, updated_at = datetime('now') WHERE id = ?", [id]);
    },
  };
}

export type SemesterRepo = ReturnType<typeof createSemesterRepo>;
