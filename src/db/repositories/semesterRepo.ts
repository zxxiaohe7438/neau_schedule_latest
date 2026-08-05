import type { Semester, SemesterCreateInput, SemesterUpdateInput } from '../../domain/Semester';
import { queryAll, queryOne, execute } from '../connection';
import { buildUpdateClause } from '../updateHelper';

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
      const upd = buildUpdateClause(
        [
          ['name', input.name],
          ['start_date', input.start_date],
          ['weeks_count', input.weeks_count],
          ['is_archived', input.is_archived === undefined ? undefined : input.is_archived ? 1 : 0],
        ],
        ["updated_at = datetime('now')"]
      );
      if (!upd) return this.getById(id)!;

      execute(`UPDATE semesters SET ${upd.clause} WHERE id = ?`, [...upd.values, id]);
      return this.getById(id)!;
    },

    delete(id: number): void {
      // 依赖 schema 中 4 张子表的 ON DELETE CASCADE 级联清理
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
