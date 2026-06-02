import { useMemo } from 'react';
import type { Course } from '../domain/Course';
import type { CourseEvent } from '../domain/CourseEvent';
import type { SectionTime } from '../domain/SectionTime';
import type { Semester } from '../domain/Semester';
import type { CellAnnotation } from '../domain/CellAnnotation';
import {
  WEEKDAY_LABELS,
  getMondayOfWeek,
  getDateOfWeekday,
  formatShortDate,
  isSameDay,
} from '../utils/dateUtils';

interface TimetableGridProps {
  semester: Semester;
  courses: Course[];
  events: CourseEvent[];
  sectionTimes: SectionTime[];
  currentWeek: number;
  unscheduledCourses?: Course[];
  cellAnnotations?: CellAnnotation[];
  onWeekChange: (week: number) => void;
  onEventClick?: (event: CourseEvent, course: Course) => void;
  onEventDoubleClick?: (event: CourseEvent, course: Course) => void;
  onCourseDoubleClick?: (course: Course) => void;
  onEmptyCellClick?: (weekday: number, sectionNo: number) => void;
}

/** Map from course_id to Course for quick lookup */
function buildCourseMap(courses: Course[]): Map<number, Course> {
  const map = new Map<number, Course>();
  for (const c of courses) {
    map.set(c.id, c);
  }
  return map;
}

/**
 * Build a grid of events keyed by [weekday][startSection].
 * For each cell, we store the event + course info.
 * Multi-section events only appear in their start_section row.
 */
interface GridCell {
  event: CourseEvent;
  course: Course;
  rowSpan: number;
}

function buildGrid(
  events: CourseEvent[],
  courseMap: Map<number, Course>,
  currentWeek: number
): Map<string, GridCell> {
  const grid = new Map<string, GridCell>();

  for (const ev of events) {
    // Check if event is active in current week
    if (currentWeek < ev.start_week || currentWeek > ev.end_week) continue;
    if (ev.week_pattern === 'odd' && currentWeek % 2 === 0) continue;
    if (ev.week_pattern === 'even' && currentWeek % 2 !== 0) continue;

    const course = courseMap.get(ev.course_id);
    if (!course) continue;

    const key = `${ev.weekday}-${ev.start_section}`;
    const rowSpan = ev.end_section - ev.start_section + 1;
    grid.set(key, { event: ev, course, rowSpan });
  }

  return grid;
}

/**
 * Build a lookup map for cell annotations keyed by "weekday-sectionNo".
 */
function buildAnnotationMap(
  annotations: CellAnnotation[],
  currentWeek: number
): Map<string, CellAnnotation> {
  const map = new Map<string, CellAnnotation>();

  for (const ann of annotations) {
    if (currentWeek < ann.start_week || currentWeek > ann.end_week) continue;
    if (ann.week_pattern === 'odd' && currentWeek % 2 === 0) continue;
    if (ann.week_pattern === 'even' && currentWeek % 2 !== 0) continue;

    const key = `${ann.weekday}-${ann.section_no}`;
    map.set(key, ann);
  }

  return map;
}

export function TimetableGrid({
  semester,
  courses,
  events,
  sectionTimes,
  currentWeek,
  unscheduledCourses = [],
  cellAnnotations = [],
  onWeekChange,
  onEventClick,
  onEventDoubleClick,
  onCourseDoubleClick,
  onEmptyCellClick,
}: TimetableGridProps) {
  const courseMap = useMemo(() => buildCourseMap(courses), [courses]);
  const grid = useMemo(
    () => buildGrid(events, courseMap, currentWeek),
    [events, courseMap, currentWeek]
  );
  const annotationMap = useMemo(
    () => buildAnnotationMap(cellAnnotations, currentWeek),
    [cellAnnotations, currentWeek]
  );

  const weekMonday = useMemo(
    () => getMondayOfWeek(currentWeek, semester.start_date),
    [currentWeek, semester.start_date]
  );

  const today = new Date();

  // Determine max section number from sectionTimes
  const maxSection =
    sectionTimes.length > 0
      ? Math.max(...sectionTimes.map((st) => st.section_no))
      : 11;

  // Build section time lookup
  const timeMap = new Map<number, SectionTime>();
  for (const st of sectionTimes) {
    timeMap.set(st.section_no, st);
  }

  // Track which cells are "covered" by a multi-row event above them
  const coveredCells = new Set<string>();
  for (const [key, cell] of grid) {
    for (let s = 1; s < cell.rowSpan; s++) {
      const parts = key.split('-');
      const weekday = parts[0];
      const startSection = parseInt(parts[1], 10);
      coveredCells.add(`${weekday}-${startSection + s}`);
    }
  }

  // Group sections into display rows (each section gets its own row)
  const sections = Array.from({ length: maxSection }, (_, i) => i + 1);

  return (
    <div className="timetable-container">
      {/* Week navigation */}
      <div className="timetable-nav">
        <button
          className="btn btn-sm"
          onClick={() => onWeekChange(Math.max(1, currentWeek - 1))}
          disabled={currentWeek <= 1}
        >
          ◀ 上一周
        </button>
        <span className="timetable-week-label">
          第 {currentWeek} 周 / 共 {semester.weeks_count} 周
        </span>
        <button
          className="btn btn-sm"
          onClick={() =>
            onWeekChange(Math.min(semester.weeks_count, currentWeek + 1))
          }
          disabled={currentWeek >= semester.weeks_count}
        >
          下一周 ▶
        </button>
      </div>

      {/* Content area */}
      <div className="timetable-content">
        {/* Grid */}
        <div
          className="timetable-grid"
          style={{
            gridTemplateRows: `48px repeat(${maxSection}, minmax(56px, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="timetable-header timetable-corner">节次</div>
          {[1, 2, 3, 4, 5, 6, 7].map((weekday) => {
            const date = getDateOfWeekday(weekMonday, weekday);
            const isToday = isSameDay(date, today);
            return (
              <div
                key={weekday}
                className={`timetable-header ${isToday ? 'today' : ''}`}
              >
                <div className="weekday-label">{WEEKDAY_LABELS[weekday]}</div>
                <div className="date-label">{formatShortDate(date)}</div>
              </div>
            );
          })}

          {/* Section rows */}
          {sections.map((sectionNo) => {
            const time = timeMap.get(sectionNo);
            return (
              <RowCells
                key={sectionNo}
                sectionNo={sectionNo}
                time={time}
                grid={grid}
                coveredCells={coveredCells}
                annotationMap={annotationMap}
                onEventClick={onEventClick}
                onEventDoubleClick={onEventDoubleClick}
                onEmptyCellClick={onEmptyCellClick}
              />
            );
          })}
        </div>

        {/* Unscheduled Courses Panel */}
        {unscheduledCourses.length > 0 && (
          <div className="unscheduled-panel">
            <div className="unscheduled-header">
              无日程课程 ({unscheduledCourses.length})
            </div>
            <div className="unscheduled-list">
              {unscheduledCourses.map((course) => (
                <div
                  key={course.id}
                  className="unscheduled-item"
                  onDoubleClick={() => onCourseDoubleClick?.(course)}
                  title="双击编辑"
                >
                  <div className="unscheduled-item-name">{course.name}</div>
                  {course.teacher && (
                    <div className="unscheduled-item-teacher">{course.teacher}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Renders a single row of the timetable (one section across all weekdays) */
function RowCells({
  sectionNo,
  time,
  grid,
  coveredCells,
  annotationMap,
  onEventClick,
  onEventDoubleClick,
  onEmptyCellClick,
}: {
  sectionNo: number;
  time: SectionTime | undefined;
  grid: Map<string, GridCell>;
  coveredCells: Set<string>;
  annotationMap: Map<string, CellAnnotation>;
  onEventClick?: (event: CourseEvent, course: Course) => void;
  onEventDoubleClick?: (event: CourseEvent, course: Course) => void;
  onEmptyCellClick?: (weekday: number, sectionNo: number) => void;
}) {
  return (
    <>
      {/* Section time label */}
      <div className="timetable-section-label">
        <span className="section-number">{sectionNo}</span>
        {time && (
          <span className="section-time">
            {time.start_time}
            <br />
            {time.end_time}
          </span>
        )}
      </div>

      {/* 7 weekday cells */}
      {[1, 2, 3, 4, 5, 6, 7].map((weekday) => {
        const key = `${weekday}-${sectionNo}`;

        // Skip covered cells (rendered by rowspan above)
        if (coveredCells.has(key)) {
          return null;
        }

        const cell = grid.get(key);
        const annotation = annotationMap.get(key);

        if (!cell) {
          // Empty cell — show annotation if exists, otherwise clickable empty cell
          if (annotation) {
            return (
              <div
                key={weekday}
                className="timetable-cell has-annotation"
                style={{ backgroundColor: annotation.color + '88' }}
                onClick={() => onEmptyCellClick?.(weekday, sectionNo)}
              >
                <div className="annotation-note">{annotation.note}</div>
              </div>
            );
          }
          return (
            <div
              key={weekday}
              className="timetable-cell empty"
              onClick={() => onEmptyCellClick?.(weekday, sectionNo)}
            />
          );
        }

        return (
          <div
            key={weekday}
            className="timetable-cell has-course"
            style={{
              gridRow: `span ${cell.rowSpan}`,
              backgroundColor: cell.course.color + '22', // light tint
              borderLeft: `3px solid ${cell.course.color}`,
            }}
            onClick={() => onEventClick?.(cell.event, cell.course)}
            onDoubleClick={() => onEventDoubleClick?.(cell.event, cell.course)}
          >
            <div
              className="course-name"
              style={{ color: cell.course.color }}
            >
              {cell.course.name}
            </div>
            <div className="course-location">{cell.event.location}</div>
            <div className="course-teacher">{cell.course.teacher}</div>
            {cell.event.note && (
              <div className="course-note" title={cell.event.note}>
                📝 {cell.event.note}
              </div>
            )}
            {cell.event.week_pattern !== 'all' && (
              <div className="course-week-pattern">
                {cell.event.week_pattern === 'odd' ? '单周' : '双周'}
              </div>
            )}
            {/* Hover tooltip */}
            <div className="course-tooltip">
              <div className="tooltip-title">{cell.course.name}</div>
              {cell.course.course_number && <div>课程号: {cell.course.course_number}</div>}
              <div>教师: {cell.course.teacher}</div>
              <div>地点: {cell.event.location}</div>
              <div>时间: 周{weekday} 第{cell.event.start_section}-{cell.event.end_section}节</div>
              <div>周次: 第{cell.event.start_week}-{cell.event.end_week}周</div>
              {cell.event.week_pattern !== 'all' && (
                <div>单双周: {cell.event.week_pattern === 'odd' ? '单周' : '双周'}</div>
              )}
              {cell.course.units > 0 && <div>学分: {cell.course.units}</div>}
              {cell.event.note && <div>备注: {cell.event.note}</div>}
              <div className="tooltip-hint">双击编辑</div>
            </div>
          </div>
        );
      })}
    </>
  );
}
