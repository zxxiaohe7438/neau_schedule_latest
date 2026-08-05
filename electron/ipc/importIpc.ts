import { ipcMain } from 'electron';
import type { ImportResult, ImportConflict } from '../../src/domain/ImportResult';
import type { WeekPattern } from '../../src/domain/CourseEvent';
import { importJson } from '../../src/importers/jsonImporter';
import { recognizeText } from '../../src/importers/textRecognizer';
import { createCourseRepo } from '../../src/db/repositories/courseRepo';
import { createCourseEventRepo } from '../../src/db/repositories/courseEventRepo';
import { createCellAnnotationRepo } from '../../src/db/repositories/cellAnnotationRepo';
import { createSemesterRepo } from '../../src/db/repositories/semesterRepo';
import { findOrCreateSemesterByName } from './semesterHelper';
import { getCourseColor } from '../../src/utils/courseColor';

/** 单双周模式是否可能在时间上重叠（odd 与 even 永远不会重叠） */
function weekPatternsOverlap(a: WeekPattern, b: WeekPattern): boolean {
  if (a === b) return true;
  return a === 'all' || b === 'all';
}

/**
 * Check for duplicates and conflicts in import result.
 *
 * 检测规则：
 * 1. source_hash 精确匹配 → 未手动修改的标记重复（静默跳过），手动修改过的标记冲突（用户裁决）；
 * 2. 同格重叠（同星期、节次相交、周次相交、单双周兼容但哈希不同，如调课/换地点）
 *    → 标记冲突，由用户裁决是否覆盖，绝不静默覆盖。
 */
export function checkDuplicatesAndConflicts(
  result: ImportResult,
  courseEventRepo: ReturnType<typeof createCourseEventRepo>,
  semesterId?: number
): void {
  // 未显式指定学期时，尝试按导入目标的学期名解析；学期尚不存在则无同格可检测
  if (!semesterId) {
    const semester = createSemesterRepo().list().find((s) => s.name === result.semester.name);
    semesterId = semester?.id;
  }

  for (const item of result.courses) {
    let existing;
    if (semesterId) {
      existing = courseEventRepo.findBySourceHashAndSemester(item.source_hash, semesterId);
    } else {
      existing = courseEventRepo.findBySourceHash(item.source_hash);
    }

    if (existing) {
      // Check if manually updated
      if (existing.updated_manually) {
        item.has_conflict = true;
        item.existing_event_id = existing.id;
        const conflict: ImportConflict = {
          course_name: item.course_name,
          existing_event_id: existing.id,
          existing_location: existing.location,
          existing_note: existing.note,
          existing_updated_manually: true,
          new_location: item.event.location ?? '',
          new_note: item.event.note ?? '',
        };
        result.conflicts.push(conflict);
      } else {
        item.is_duplicate = true;
      }
      continue;
    }

    // 哈希未命中 → 同格重叠检测（调课/换地点后哈希变化，但格子相同）
    if (!semesterId) continue;
    const slotEvents = courseEventRepo.findBySlotAndSemester(semesterId, {
      weekday: item.event.weekday,
      start_section: item.event.start_section,
      end_section: item.event.end_section,
      start_week: item.event.start_week,
      end_week: item.event.end_week,
    });
    for (const slotEvent of slotEvents) {
      if (slotEvent.source_hash === item.source_hash) continue;
      if (!weekPatternsOverlap(item.event.week_pattern, slotEvent.week_pattern)) continue;

      item.has_conflict = true;
      item.existing_event_id = slotEvent.id;
      result.conflicts.push({
        course_name: item.course_name,
        existing_event_id: slotEvent.id,
        existing_location: slotEvent.location,
        existing_note: slotEvent.note,
        existing_updated_manually: slotEvent.updated_manually,
        new_location: item.event.location ?? '',
        new_note: item.event.note ?? '',
      });
      break; // 每个导入项至多关联一个本地事件
    }
  }
}

export function registerImportIpc(): void {
  const courseRepo = createCourseRepo();
  const courseEventRepo = createCourseEventRepo();
  const cellAnnotationRepo = createCellAnnotationRepo();

  ipcMain.handle('import:json', (_event, data: unknown): ImportResult => {
    const result = importJson(data);
    checkDuplicatesAndConflicts(result, courseEventRepo);
    return result;
  });

  ipcMain.handle('import:recognizeText', (_event, text: string): ImportResult => {
    const result = recognizeText(text);
    checkDuplicatesAndConflicts(result, courseEventRepo);
    return result;
  });

  ipcMain.handle(
    'import:confirm',
    (_event, result: ImportResult, options?: { overwrite?: boolean }): void => {
      const { semester: semesterData, courses } = result;
      const overwrite = options?.overwrite === true;

      // Find or create semester（同名存在时同步导入日期）
      const semester = findOrCreateSemesterByName(semesterData);

      // 覆盖模式：先清空目标学期现有课程/事件/格子备注（节次时间保留），再全量导入。
      // 用户在导入预览显式选择覆盖并二次确认，非静默覆盖。
      if (overwrite) {
        courseRepo.deleteBySemester(semester.id);
        cellAnnotationRepo.deleteBySemester(semester.id);
      }

      // Track created courses by name to avoid duplicates
      const courseMap = new Map<string, number>();

      // Import courses and events
      for (const item of courses) {
        // 覆盖模式：跳过重复/冲突裁决，全量导入
        if (!overwrite) {
          // Skip duplicates
          if (item.is_duplicate) continue;

          // 冲突处理：skip / keep_local 均保留本地，不新建不覆盖
          if (item.has_conflict && item.conflict_resolution !== 'overwrite') continue;

          // 冲突-覆盖：更新本地事件（含同格冲突，按检测阶段记录的事件 id）
          if (item.has_conflict && item.existing_event_id != null) {
            courseEventRepo.update(item.existing_event_id, {
              location: item.event.location,
              note: item.event.note,
              weekday: item.event.weekday,
              start_section: item.event.start_section,
              end_section: item.event.end_section,
              start_week: item.event.start_week,
              end_week: item.event.end_week,
              week_pattern: item.event.week_pattern,
            });
            continue;
          }
        }

        // Get or create course
        let courseId = courseMap.get(item.course_name);
        if (!courseId) {
          // Check if course already exists in database
          const existingCourses = courseRepo.listBySemester(semester.id);
          const existing = existingCourses.find((c) => c.name === item.course_name);

          // Assign color based on course name（哈希稳定：同名课程颜色一致）
          const color = getCourseColor(item.course_name);

          if (existing) {
            courseId = existing.id;
            // 同名课程颜色统一：修正历史数据中颜色与哈希色不一致的课程
            if (existing.color !== color) {
              courseRepo.update(existing.id, { color });
            }
          } else {
            const course = courseRepo.create({
              semester_id: semester.id,
              course_number: item.course_number ?? '',
              name: item.course_name,
              teacher: item.teacher,
              color,
            });
            courseId = course.id;
          }
          courseMap.set(item.course_name, courseId);
        }

        // Create new course event
        courseEventRepo.create({
          ...item.event,
          course_id: courseId,
        });
      }

      // Import unscheduled courses (courses without fixed schedule)
      const { unscheduled_courses } = result;
      if (unscheduled_courses) {
        for (const item of unscheduled_courses) {
          // 合并模式：同名课程已存在则跳过；覆盖模式已清空，直接创建
          if (!overwrite) {
            const existingCourses = courseRepo.listBySemester(semester.id);
            const existing = existingCourses.find((c) => c.name === item.course_name);
            if (existing) continue;
          }
          const color = getCourseColor(item.course_name);
          courseRepo.create({
            semester_id: semester.id,
            course_number: item.course_number,
            name: item.course_name,
            teacher: item.teacher,
            color,
            units: item.units,
          });
        }
      }
    }
  );
}
