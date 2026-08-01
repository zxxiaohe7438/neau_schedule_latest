/**
 * Development seed data for testing the UI.
 * This data is only loaded in development mode.
 */

import type { Semester } from '../domain/Semester';
import type { Course } from '../domain/Course';
import type { CourseEvent } from '../domain/CourseEvent';
import { getCourseColor } from '../utils/courseColor';

// 统一使用 SectionTime.ts 中的默认节次时间（12 节，与学校作息一致）
export { DEFAULT_SECTION_TIMES } from '../domain/SectionTime';

/** Mock semester for development */
export const MOCK_SEMESTER: Omit<Semester, 'id' | 'created_at' | 'updated_at'> = {
  name: '2025-2026-2 (开发测试)',
  start_date: '2026-03-02',
  weeks_count: 18,
  is_archived: false,
};

/** Mock courses with various characteristics */
export const MOCK_COURSES: Array<Omit<Course, 'id' | 'semester_id' | 'created_at' | 'updated_at'>> = [
  {
    course_number: '19600495j',
    name: '数据库原理与应用',
    teacher: '张老师',
    color: getCourseColor('数据库原理与应用'),
    units: 3.0,
  },
  {
    course_number: '19600496j',
    name: '操作系统',
    teacher: '李老师',
    color: getCourseColor('操作系统'),
    units: 3.0,
  },
  {
    course_number: '19600497j',
    name: '计算机网络',
    teacher: '王老师',
    color: getCourseColor('计算机网络'),
    units: 2.5,
  },
  {
    course_number: '19600498j',
    name: '软件工程',
    teacher: '赵老师',
    color: getCourseColor('软件工程'),
    units: 2.0,
  },
  {
    course_number: '20600057g',
    name: '高等数学',
    teacher: '刘老师',
    color: getCourseColor('高等数学'),
    units: 5.0,
  },
  {
    course_number: '20700008g',
    name: '英语',
    teacher: '陈老师',
    color: getCourseColor('英语'),
    units: 2.0,
  },
];

/**
 * Generate mock course events for a given semester and courses.
 * Courses array must have the same length as MOCK_COURSES.
 */
export function generateMockEvents(
  courseIds: number[]
): Array<Omit<CourseEvent, 'id' | 'created_at' | 'updated_at'>> {
  if (courseIds.length !== MOCK_COURSES.length) {
    throw new Error('courseIds length must match MOCK_COURSES length');
  }

  return [
    // 数据库原理与应用: 周一 1-2节, 全部周, 成栋楼A101
    {
      course_id: courseIds[0],
      weekday: 1,
      start_section: 1,
      end_section: 2,
      start_week: 1,
      end_week: 18,
      week_pattern: 'all',
      location: '成栋楼A101',
      note: '必修课',
      source_hash: '',
      updated_manually: false,
    },
    // 操作系统: 周二 3-4节, 单周, 主楼B201
    {
      course_id: courseIds[1],
      weekday: 2,
      start_section: 3,
      end_section: 4,
      start_week: 1,
      end_week: 17,
      week_pattern: 'odd',
      location: '主楼B201',
      note: '',
      source_hash: '',
      updated_manually: false,
    },
    // 计算机网络: 周三 5-7节 (长课), 全部周, 实验楼C301
    {
      course_id: courseIds[2],
      weekday: 3,
      start_section: 5,
      end_section: 7,
      start_week: 1,
      end_week: 16,
      week_pattern: 'all',
      location: '实验楼C301',
      note: '实验课，需要带电脑',
      source_hash: '',
      updated_manually: false,
    },
    // 软件工程: 周四 1-4节 (超长课), 双周, 工程楼D401
    {
      course_id: courseIds[3],
      weekday: 4,
      start_section: 1,
      end_section: 4,
      start_week: 2,
      end_week: 18,
      week_pattern: 'even',
      location: '工程楼D401',
      note: '项目实践课',
      source_hash: '',
      updated_manually: false,
    },
    // 高等数学: 周五 3-4节, 全部周, 教学楼E101
    {
      course_id: courseIds[4],
      weekday: 5,
      start_section: 3,
      end_section: 4,
      start_week: 1,
      end_week: 18,
      week_pattern: 'all',
      location: '教学楼E101',
      note: '',
      source_hash: '',
      updated_manually: false,
    },
    // 英语: 周一 5-6节, 全部周, 外语楼F201
    {
      course_id: courseIds[5],
      weekday: 1,
      start_section: 5,
      end_section: 6,
      start_week: 1,
      end_week: 18,
      week_pattern: 'all',
      location: '外语楼F201',
      note: '需要带耳机',
      source_hash: '',
      updated_manually: false,
    },
    // 数据库原理与应用: 周五 5-6节, 全部周, 成栋楼A101 (同一门课第二个时间段)
    {
      course_id: courseIds[0],
      weekday: 5,
      start_section: 5,
      end_section: 6,
      start_week: 1,
      end_week: 18,
      week_pattern: 'all',
      location: '成栋楼A101',
      note: '习题课',
      source_hash: '',
      updated_manually: false,
    },
  ];
}
