/**
 * IPC 层学期创建/查找共享逻辑。
 * 收敛了此前 semesterIpc / importIpc / backupIpc / devIpc 中重复的
 * "创建学期 + 初始化默认节次时间" 与 "按名称查找或创建" 逻辑。
 */
import { createSemesterRepo } from '../../src/db/repositories/semesterRepo';
import { createSectionTimeRepo } from '../../src/db/repositories/sectionTimeRepo';
import { DEFAULT_SECTION_TIMES } from '../../src/domain/SectionTime';
import type { Semester, SemesterCreateInput } from '../../src/domain/Semester';

/** 创建学期并初始化默认节次时间 */
export function createSemesterWithDefaultTimes(input: SemesterCreateInput): Semester {
  const semester = createSemesterRepo().create(input);
  createSectionTimeRepo().upsertBatch(semester.id, DEFAULT_SECTION_TIMES);
  return semester;
}

/** 按名称查找学期，不存在则创建（导入、备份恢复共用） */
export function findOrCreateSemesterByName(input: SemesterCreateInput): Semester {
  const semesterRepo = createSemesterRepo();
  const existing = semesterRepo.list().find((s) => s.name === input.name);
  if (existing) {
    // 同名学期已存在：同步导入来源的开学日期与周数（name/is_archived 保留），
    // 保证课表展示的"当前周/日期"与导入数据（如官网抓取）对齐。
    // 仅当输入携带有效日期时才同步——HTML/智能粘贴等无日期导入不覆盖已有日期。
    if (
      input.start_date &&
      (existing.start_date !== input.start_date || existing.weeks_count !== input.weeks_count)
    ) {
      return semesterRepo.update(existing.id, {
        start_date: input.start_date,
        weeks_count: input.weeks_count,
      });
    }
    return existing;
  }
  return createSemesterWithDefaultTimes(input);
}
