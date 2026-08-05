import { useMemo } from 'react';
import type { Course } from '../domain/Course';
import type { CourseEvent } from '../domain/CourseEvent';
import { WEEKDAY_LABELS } from '../utils/dateUtils';

interface CourseListViewProps {
  courses: Course[];
  events: CourseEvent[];
  onDeleteEvent?: (eventId: number) => void;
  onDeleteCourse?: (courseId: number) => void;
  onEditEvent?: (event: CourseEvent) => void;
  onEditCourse?: (course: Course) => void;
}

interface CourseWithEvents {
  course: Course;
  events: CourseEvent[];
}

function groupByCourse(
  courses: Course[],
  events: CourseEvent[]
): CourseWithEvents[] {
  const eventMap = new Map<number, CourseEvent[]>();
  for (const ev of events) {
    const list = eventMap.get(ev.course_id) ?? [];
    list.push(ev);
    eventMap.set(ev.course_id, list);
  }

  return courses.map((course) => ({
    course,
    events: (eventMap.get(course.id) ?? []).sort(
      (a, b) => a.weekday - b.weekday || a.start_section - b.start_section
    ),
  }));
}

function formatWeekPattern(event: CourseEvent): string {
  const weekRange = `${event.start_week}-${event.end_week}周`;
  if (event.week_pattern === 'odd') return `${weekRange} 单周`;
  if (event.week_pattern === 'even') return `${weekRange} 双周`;
  return weekRange;
}

function formatSections(event: CourseEvent): string {
  if (event.start_section === event.end_section) {
    return `第${event.start_section}节`;
  }
  return `第${event.start_section}-${event.end_section}节`;
}

export function CourseListView({
  courses,
  events,
  onDeleteEvent,
  onDeleteCourse,
  onEditEvent,
  onEditCourse,
}: CourseListViewProps) {
  const grouped = useMemo(() => groupByCourse(courses, events), [courses, events]);

  if (courses.length === 0) {
    return (
      <div className="empty-state">
        <p>暂无课程数据</p>
        <p className="text-muted">请先创建学期，然后导入或手动添加课程</p>
      </div>
    );
  }

  return (
    <div className="course-list-view">
      <div className="course-list-summary">
        共 {courses.length} 门课程，{events.length} 个课时安排
      </div>
      {grouped.map(({ course, events: courseEvents }) => (
        <div key={course.id} className="course-group">
          <div className="course-group-header">
            <div className="course-group-title">
              <div className="course-group-name-row">
                <span
                  className="course-color-dot"
                  style={{ backgroundColor: course.color }}
                />
                <span className="course-group-name">{course.name}</span>
              </div>
              {(course.course_number || course.teacher) && (
                <div className="course-group-meta">
                  {course.course_number && (
                    <span className="course-group-number">{course.course_number}</span>
                  )}
                  {course.teacher && (
                    <span className="course-group-teacher">{course.teacher}</span>
                  )}
                </div>
              )}
            </div>
            <div className="course-group-actions">
              {onEditCourse && (
                <button
                  className="btn btn-sm"
                  onClick={() => onEditCourse(course)}
                >
                  编辑
                </button>
              )}
              {onDeleteCourse && (
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => onDeleteCourse(course.id)}
                >
                  删除课程
                </button>
              )}
            </div>
          </div>

          {courseEvents.length === 0 ? (
            <div className="text-muted" style={{ padding: '8px 16px' }}>
              暂无课时安排
            </div>
          ) : (
            <table className="course-event-table">
              <thead>
                <tr>
                  <th>星期</th>
                  <th>节次</th>
                  <th>地点</th>
                  <th>周次</th>
                  <th>备注</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {courseEvents.map((ev) => (
                  <tr key={ev.id}>
                    <td>{WEEKDAY_LABELS[ev.weekday] ?? `周${ev.weekday}`}</td>
                    <td>{formatSections(ev)}</td>
                    <td>{ev.location || '-'}</td>
                    <td>{formatWeekPattern(ev)}</td>
                    <td className="note-cell" title={ev.note || undefined}>{ev.note || '-'}</td>
                    <td>
                      <div className="event-actions">
                        {onEditEvent && (
                          <button
                            className="btn btn-sm"
                            onClick={() => onEditEvent(ev)}
                          >
                            编辑
                          </button>
                        )}
                        {onDeleteEvent && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => onDeleteEvent(ev.id)}
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
