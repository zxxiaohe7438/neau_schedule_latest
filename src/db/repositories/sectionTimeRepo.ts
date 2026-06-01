import type { SectionTime, SectionTimeCreateInput } from '../../domain/SectionTime';
import { queryAll, execute, transaction } from '../connection';

export function createSectionTimeRepo() {
  return {
    listBySemester(semesterId: number): SectionTime[] {
      return queryAll<SectionTime>(
        'SELECT * FROM section_times WHERE semester_id = ? ORDER BY section_no',
        [semesterId]
      );
    },

    upsertBatch(semesterId: number, times: SectionTimeCreateInput[]): SectionTime[] {
      transaction(() => {
        for (const t of times) {
          execute(
            `INSERT INTO section_times (semester_id, section_no, start_time, end_time)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(semester_id, section_no) DO UPDATE SET
               start_time = excluded.start_time,
               end_time = excluded.end_time`,
            [semesterId, t.section_no, t.start_time, t.end_time]
          );
        }
      });

      return this.listBySemester(semesterId);
    },
  };
}

export type SectionTimeRepo = ReturnType<typeof createSectionTimeRepo>;
