import { useState, useEffect } from 'react';
import type { Course, CourseUpdateInput } from '../domain/Course';
import type { CourseEvent, CourseEventUpdateInput, WeekPattern } from '../domain/CourseEvent';
import { WEEKDAY_LABELS } from '../utils/dateUtils';

interface CourseEditorProps {
  course: Course;
  event?: CourseEvent;
  onSave: (courseData: CourseUpdateInput, eventData?: CourseEventUpdateInput) => void;
  onCancel: () => void;
}

export function CourseEditor({ course, event, onSave, onCancel }: CourseEditorProps) {
  const [courseName, setCourseName] = useState(course.name);
  const [teacher, setTeacher] = useState(course.teacher);
  const [weekday, setWeekday] = useState(event?.weekday ?? 1);
  const [startSection, setStartSection] = useState(event?.start_section ?? 1);
  const [endSection, setEndSection] = useState(event?.end_section ?? 2);
  const [startWeek, setStartWeek] = useState(event?.start_week ?? 1);
  const [endWeek, setEndWeek] = useState(event?.end_week ?? 18);
  const [weekPattern, setWeekPattern] = useState<WeekPattern>(event?.week_pattern ?? 'all');
  const [location, setLocation] = useState(event?.location ?? '');
  const [note, setNote] = useState(event?.note ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    setCourseName(course.name);
    setTeacher(course.teacher);
    if (event) {
      setWeekday(event.weekday);
      setStartSection(event.start_section);
      setEndSection(event.end_section);
      setStartWeek(event.start_week);
      setEndWeek(event.end_week);
      setWeekPattern(event.week_pattern);
      setLocation(event.location);
      setNote(event.note);
    }
  }, [course, event]);

  const handleSave = () => {
    setError('');

    if (!courseName.trim()) {
      setError('课程名不能为空');
      return;
    }
    if (startSection > endSection) {
      setError('开始节次不能大于结束节次');
      return;
    }
    if (startWeek > endWeek) {
      setError('开始周次不能大于结束周次');
      return;
    }

    const courseData: CourseUpdateInput = {};
    if (courseName !== course.name) courseData.name = courseName;
    if (teacher !== course.teacher) courseData.teacher = teacher;

    const eventData: CourseEventUpdateInput = {};
    if (event) {
      if (weekday !== event.weekday) eventData.weekday = weekday;
      if (startSection !== event.start_section) eventData.start_section = startSection;
      if (endSection !== event.end_section) eventData.end_section = endSection;
      if (startWeek !== event.start_week) eventData.start_week = startWeek;
      if (endWeek !== event.end_week) eventData.end_week = endWeek;
      if (weekPattern !== event.week_pattern) eventData.week_pattern = weekPattern;
      if (location !== event.location) eventData.location = location;
      if (note !== event.note) eventData.note = note;
    }

    onSave(courseData, event ? eventData : undefined);
  };

  return (
    <div className="course-editor">
      <div className="editor-header">
        <h3>{event ? '编辑课程安排' : '编辑课程'}</h3>
      </div>

      <div className="editor-body">
        <div className="form-group">
          <label>课程名</label>
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="例如：数据库原理与应用"
          />
        </div>

        <div className="form-group">
          <label>教师</label>
          <input
            type="text"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            placeholder="例如：张老师"
          />
        </div>

        {event && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>星期</label>
                <select
                  value={weekday}
                  onChange={(e) => setWeekday(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <option key={d} value={d}>
                      {WEEKDAY_LABELS[d]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>开始节次</label>
                <input
                  type="number"
                  min={1}
                  max={11}
                  value={startSection}
                  onChange={(e) => setStartSection(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>结束节次</label>
                <input
                  type="number"
                  min={1}
                  max={11}
                  value={endSection}
                  onChange={(e) => setEndSection(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>开始周</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={startWeek}
                  onChange={(e) => setStartWeek(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>结束周</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={endWeek}
                  onChange={(e) => setEndWeek(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>单双周</label>
                <select
                  value={weekPattern}
                  onChange={(e) => setWeekPattern(e.target.value as WeekPattern)}
                >
                  <option value="all">全部</option>
                  <option value="odd">单周</option>
                  <option value="even">双周</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>地点</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：成栋楼A101"
              />
            </div>

            <div className="form-group">
              <label>备注</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="可选备注"
                rows={2}
              />
            </div>
          </>
        )}

        {error && <p className="form-error">{error}</p>}
      </div>

      <div className="editor-actions">
        <button className="btn btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          保存
        </button>
      </div>
    </div>
  );
}
