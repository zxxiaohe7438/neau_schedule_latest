import type {
  CellAnnotation,
  CellAnnotationCreateInput,
  CellAnnotationUpdateInput,
} from '../../domain/CellAnnotation';
import { queryAll, queryOne, execute } from '../connection';

export function createCellAnnotationRepo() {
  return {
    listBySemester(semesterId: number): CellAnnotation[] {
      return queryAll<CellAnnotation>(
        'SELECT * FROM cell_annotations WHERE semester_id = ? ORDER BY weekday, section_no',
        [semesterId]
      );
    },

    findByCell(
      semesterId: number,
      weekday: number,
      sectionNo: number,
      week: number,
      weekPattern: string
    ): CellAnnotation | undefined {
      return queryOne<CellAnnotation>(
        `SELECT * FROM cell_annotations
         WHERE semester_id = ? AND weekday = ? AND section_no = ?
         AND start_week <= ? AND end_week >= ?
         AND (week_pattern = 'all' OR week_pattern = ?)`,
        [semesterId, weekday, sectionNo, week, week, weekPattern]
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
      const fields: string[] = [];
      const values: unknown[] = [];

      if (input.note !== undefined) {
        fields.push('note = ?');
        values.push(input.note);
      }
      if (input.color !== undefined) {
        fields.push('color = ?');
        values.push(input.color);
      }

      if (fields.length === 0) return this.getById(id)!;

      fields.push("updated_at = datetime('now')");
      values.push(id);

      execute(`UPDATE cell_annotations SET ${fields.join(', ')} WHERE id = ?`, values);
      return this.getById(id)!;
    },

    delete(id: number): void {
      execute('DELETE FROM cell_annotations WHERE id = ?', [id]);
    },

    deleteBySemester(semesterId: number): void {
      execute('DELETE FROM cell_annotations WHERE semester_id = ?', [semesterId]);
    },

    getById(id: number): CellAnnotation | undefined {
      return queryOne<CellAnnotation>('SELECT * FROM cell_annotations WHERE id = ?', [id]);
    },
  };
}

export type CellAnnotationRepo = ReturnType<typeof createCellAnnotationRepo>;
