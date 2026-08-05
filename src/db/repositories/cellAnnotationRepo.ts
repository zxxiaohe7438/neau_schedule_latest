import type {
  CellAnnotation,
  CellAnnotationCreateInput,
  CellAnnotationUpdateInput,
} from '../../domain/CellAnnotation';
import { queryAll, queryOne, execute } from '../connection';
import { buildUpdateClause } from '../updateHelper';

export function createCellAnnotationRepo() {
  return {
    listBySemester(semesterId: number): CellAnnotation[] {
      return queryAll<CellAnnotation>(
        'SELECT * FROM cell_annotations WHERE semester_id = ? ORDER BY weekday, section_no',
        [semesterId]
      );
    },

    create(input: CellAnnotationCreateInput): CellAnnotation {
      const result = execute(
        `INSERT INTO cell_annotations
         (semester_id, weekday, section_no, start_week, end_week, week_pattern, note, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.semester_id,
          input.weekday,
          input.section_no,
          input.start_week,
          input.end_week,
          input.week_pattern,
          input.note,
          input.color ?? '#FFE082',
        ]
      );
      return this.getById(result.lastInsertRowid)!;
    },

    update(id: number, input: CellAnnotationUpdateInput): CellAnnotation {
      const upd = buildUpdateClause(
        [
          ['note', input.note],
          ['color', input.color],
        ],
        ["updated_at = datetime('now')"]
      );
      if (!upd) return this.getById(id)!;

      execute(`UPDATE cell_annotations SET ${upd.clause} WHERE id = ?`, [...upd.values, id]);
      return this.getById(id)!;
    },

    delete(id: number): void {
      execute('DELETE FROM cell_annotations WHERE id = ?', [id]);
    },

    /** 清空某学期全部格子备注 */
    deleteBySemester(semesterId: number): void {
      execute('DELETE FROM cell_annotations WHERE semester_id = ?', [semesterId]);
    },

    getById(id: number): CellAnnotation | undefined {
      return queryOne<CellAnnotation>('SELECT * FROM cell_annotations WHERE id = ?', [id]);
    },
  };
}

export type CellAnnotationRepo = ReturnType<typeof createCellAnnotationRepo>;
