import type { ImportResult, ImportCourseItem, ImportError, ImportConflict } from '../domain/ImportResult';
import { WEEKDAY_LABELS } from '../utils/dateUtils';

interface ImportPreviewProps {
  result: ImportResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportPreview({ result, onConfirm, onCancel }: ImportPreviewProps) {
  const { semester, courses, errors, conflicts, total_count } = result;
  const hasErrors = errors.length > 0;
  const hasConflicts = conflicts.length > 0;
  const duplicates = courses.filter((c) => c.is_duplicate);
  const validCourses = courses.filter((c) => !c.is_duplicate && !c.has_conflict);

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
              <span className="summary-item success">✓ {validCourses.length} 条可导入</span>
            )}
            {duplicates.length > 0 && (
              <span className="summary-item warning">⚠ {duplicates.length} 条重复</span>
            )}
            {hasConflicts && (
              <span className="summary-item error">✗ {conflicts.length} 条冲突</span>
            )}
            {hasErrors && (
              <span className="summary-item error">✗ {errors.length} 个错误</span>
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
            <h4 className="text-warning">冲突</h4>
            <div className="conflict-list">
              {conflicts.map((conflict, i) => (
                <ConflictItem key={i} conflict={conflict} />
              ))}
            </div>
          </div>
        )}

        {/* Course List */}
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
            <h4 className="text-warning">重复课程（将跳过）</h4>
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
      </div>

      <div className="preview-actions">
        <button className="btn btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={hasErrors || validCourses.length === 0}
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

function ConflictItem({ conflict }: { conflict: ImportConflict }) {
  return (
    <div className="conflict-item">
      <div className="conflict-course">{conflict.course_name}</div>
      <div className="conflict-details">
        <div className="conflict-existing">
          <span className="conflict-label">现有：</span>
          <span>地点 {conflict.existing_location || '无'}</span>
          <span>备注 {conflict.existing_note || '无'}</span>
          {conflict.existing_updated_manually && (
            <span className="badge">手动修改过</span>
          )}
        </div>
        <div className="conflict-new">
          <span className="conflict-label">新数据：</span>
          <span>地点 {conflict.new_location || '无'}</span>
          <span>备注 {conflict.new_note || '无'}</span>
        </div>
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
