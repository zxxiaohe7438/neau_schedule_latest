import { useState } from 'react';
import type { ImportResult, ImportCourseItem, ImportError, ImportConflict } from '../domain/ImportResult';
import { WEEKDAY_LABELS } from '../utils/dateUtils';

interface ImportPreviewProps {
  result: ImportResult;
  onConfirm: (result: ImportResult) => void;
  onCancel: () => void;
}

export function ImportPreview({ result, onConfirm, onCancel }: ImportPreviewProps) {
  const { semester, courses, unscheduled_courses, errors, conflicts, total_count } = result;
  const hasErrors = errors.length > 0;
  const hasConflicts = conflicts.length > 0;
  const duplicates = courses.filter((c) => c.is_duplicate);
  const conflictCourses = courses.filter((c) => c.has_conflict);
  const validCourses = courses.filter((c) => !c.is_duplicate && !c.has_conflict);
  const hasUnscheduled = unscheduled_courses && unscheduled_courses.length > 0;

  // Track conflict resolutions
  const [resolutions, setResolutions] = useState<Record<string, 'skip' | 'overwrite' | 'keep_local'>>(
    Object.fromEntries(conflictCourses.map((c) => [c.source_hash, 'keep_local']))
  );

  const handleResolutionChange = (sourceHash: string, resolution: 'skip' | 'overwrite' | 'keep_local') => {
    setResolutions((prev) => ({ ...prev, [sourceHash]: resolution }));
  };

  const handleConfirm = () => {
    // Apply resolutions to result
    const updatedResult = { ...result };
    updatedResult.courses = courses.map((c) => {
      if (c.has_conflict) {
        return { ...c, conflict_resolution: resolutions[c.source_hash] ?? 'keep_local' };
      }
      return c;
    });
    onConfirm(updatedResult);
  };

  return (
    <div className="import-preview">
      <div className="preview-header">
        <h3>导入预览</h3>
      </div>

      <div className="preview-body">
        {/* Semester Info */}
        <div className="preview-section">
          <h4>学期信息</h4>
          <div className="semester-info">
            <span className="info-label">名称：</span>
            <span>{semester.name || '未指定'}</span>
            <span className="info-label">开始日期：</span>
            <span>{semester.start_date || '未指定'}</span>
            <span className="info-label">总周数：</span>
            <span>{semester.weeks_count}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="preview-section">
          <h4>导入摘要</h4>
          <div className="import-summary">
            <span className="summary-item">总计 {total_count} 条课程安排</span>
            {validCourses.length > 0 && (
              <span className="summary-item success">✓ {validCourses.length} 条新增</span>
            )}
            {duplicates.length > 0 && (
              <span className="summary-item warning">⚠ {duplicates.length} 条重复（跳过）</span>
            )}
            {hasConflicts && (
              <span className="summary-item error">⚠ {conflicts.length} 条冲突（需处理）</span>
            )}
            {hasErrors && (
              <span className="summary-item error">✗ {errors.length} 个错误</span>
            )}
            {hasUnscheduled && (
              <span className="summary-item info">ℹ {unscheduled_courses.length} 门无日程课程</span>
            )}
          </div>
        </div>

        {/* Errors */}
        {hasErrors && (
          <div className="preview-section">
            <h4 className="text-error">错误</h4>
            <div className="error-list">
              {errors.map((err, i) => (
                <ErrorItem key={i} error={err} />
              ))}
            </div>
          </div>
        )}

        {/* Conflicts */}
        {hasConflicts && (
          <div className="preview-section">
            <h4 className="text-warning">冲突处理</h4>
            <p className="text-muted" style={{ marginBottom: 12 }}>
              以下课程已被手动修改过，请选择处理方式：
            </p>
            <div className="conflict-list">
              {conflictCourses.map((course, i) => (
                <ConflictItem
                  key={i}
                  course={course}
                  conflict={conflicts.find((c) => c.course_name === course.course_name)}
                  resolution={resolutions[course.source_hash] ?? 'keep_local'}
                  onResolutionChange={(r) => handleResolutionChange(course.source_hash, r)}
                />
              ))}
            </div>
          </div>
        )}

        {/* New Courses */}
        {validCourses.length > 0 && (
          <div className="preview-section">
            <h4>将要导入的课程</h4>
            <table className="preview-table">
              <thead>
                <tr>
                  <th>课程名</th>
                  <th>教师</th>
                  <th>地点</th>
                  <th>星期</th>
                  <th>节次</th>
                  <th>周次</th>
                  <th>单双周</th>
                </tr>
              </thead>
              <tbody>
                {validCourses.map((course, i) => (
                  <CourseRow key={i} course={course} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Duplicates */}
        {duplicates.length > 0 && (
          <div className="preview-section">
            <h4 className="text-muted">重复课程（将跳过）</h4>
            <table className="preview-table">
              <thead>
                <tr>
                  <th>课程名</th>
                  <th>教师</th>
                  <th>地点</th>
                  <th>星期</th>
                  <th>节次</th>
                  <th>周次</th>
                </tr>
              </thead>
              <tbody>
                {duplicates.map((course, i) => (
                  <CourseRow key={i} course={course} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Unscheduled Courses */}
        {hasUnscheduled && (
          <div className="preview-section">
            <h4>无日程课程（网课/选修）</h4>
            <p className="text-muted" style={{ marginBottom: 12 }}>
              以下课程没有固定的上课时间和地点，通常是网课或需要自行安排的选修课。
            </p>
            <table className="preview-table">
              <thead>
                <tr>
                  <th>课程名</th>
                  <th>教师</th>
                </tr>
              </thead>
              <tbody>
                {unscheduled_courses.map((course, i) => (
                  <tr key={i}>
                    <td>{course.course_name}</td>
                    <td>{course.teacher || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="preview-actions">
        <button className="btn btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button
          className="btn btn-primary"
          onClick={handleConfirm}
          disabled={hasErrors || (validCourses.length === 0 && !hasConflicts)}
        >
          确认导入
        </button>
      </div>
    </div>
  );
}

function ErrorItem({ error }: { error: ImportError }) {
  return (
    <div className="error-item">
      {error.index >= 0 && <span className="error-index">第 {error.index + 1} 条：</span>}
      <span className="error-field">{error.field}</span>
      <span className="error-message">— {error.message}</span>
    </div>
  );
}

function ConflictItem({
  course,
  conflict,
  resolution,
  onResolutionChange,
}: {
  course: ImportCourseItem;
  conflict?: ImportConflict;
  resolution: 'skip' | 'overwrite' | 'keep_local';
  onResolutionChange: (r: 'skip' | 'overwrite' | 'keep_local') => void;
}) {
  return (
    <div className="conflict-item">
      <div className="conflict-course">{course.course_name}</div>
      <div className="conflict-details">
        <div className="conflict-existing">
          <span className="conflict-label">本地：</span>
          <span>地点 {conflict?.existing_location || '无'}</span>
          <span>备注 {conflict?.existing_note || '无'}</span>
          <span className="badge">手动修改过</span>
        </div>
        <div className="conflict-new">
          <span className="conflict-label">导入：</span>
          <span>地点 {conflict?.new_location || course.event.location || '无'}</span>
          <span>备注 {conflict?.new_note || course.event.note || '无'}</span>
        </div>
      </div>
      <div className="conflict-actions">
        <label className="radio-label">
          <input
            type="radio"
            name={`conflict-${course.source_hash}`}
            value="keep_local"
            checked={resolution === 'keep_local'}
            onChange={() => onResolutionChange('keep_local')}
          />
          保留本地
        </label>
        <label className="radio-label">
          <input
            type="radio"
            name={`conflict-${course.source_hash}`}
            value="overwrite"
            checked={resolution === 'overwrite'}
            onChange={() => onResolutionChange('overwrite')}
          />
          覆盖为导入
        </label>
        <label className="radio-label">
          <input
            type="radio"
            name={`conflict-${course.source_hash}`}
            value="skip"
            checked={resolution === 'skip'}
            onChange={() => onResolutionChange('skip')}
          />
          跳过
        </label>
      </div>
    </div>
  );
}

function CourseRow({ course }: { course: ImportCourseItem }) {
  const { event } = course;

  const formatSections = () => {
    if (event.start_section === event.end_section) {
      return `第${event.start_section}节`;
    }
    return `第${event.start_section}-${event.end_section}节`;
  };

  const formatWeeks = () => {
    return `${event.start_week}-${event.end_week}周`;
  };

  const formatWeekPattern = () => {
    if (event.week_pattern === 'odd') return '单周';
    if (event.week_pattern === 'even') return '双周';
    return '全部';
  };

  return (
    <tr>
      <td>{course.course_name}</td>
      <td>{course.teacher || '-'}</td>
      <td>{event.location || '-'}</td>
      <td>{WEEKDAY_LABELS[event.weekday] ?? `周${event.weekday}`}</td>
      <td>{formatSections()}</td>
      <td>{formatWeeks()}</td>
      <td>{formatWeekPattern()}</td>
    </tr>
  );
}
