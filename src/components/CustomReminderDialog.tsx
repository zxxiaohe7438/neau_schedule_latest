import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Course } from '../domain/Course';
import type { CourseEvent } from '../domain/CourseEvent';
import type { CellAnnotation } from '../domain/CellAnnotation';
import type { Semester } from '../domain/Semester';
import type { SectionTime } from '../domain/SectionTime';
import { computeEventDateTime } from '../utils/reminderUtils';
import {
  getCustomRemindersForSource,
  addCustomReminder,
  type ReminderSourceType,
} from '../utils/customReminders';
import { WEEKDAY_LABELS } from '../utils/dateUtils';
import { ReminderForm } from './ReminderForm';

interface CustomReminderDialogProps {
  sourceType: ReminderSourceType;
  course?: Course;
  event?: CourseEvent;
  annotation?: CellAnnotation;
  semester: Semester;
  currentWeek: number;
  sectionTimes: SectionTime[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function CustomReminderDialog({
  sourceType,
  course,
  event,
  annotation,
  semester,
  currentWeek,
  sectionTimes,
  onConfirm,
  onCancel,
}: CustomReminderDialogProps) {
  // 计算事件信息
  const eventInfo = useMemo(() => {
    if (sourceType === 'event' && event) {
      const startTime = sectionTimes.find(t => t.section_no === event.start_section);
      if (!startTime) return null;
      const eventDateTime = computeEventDateTime(semester, currentWeek, event.weekday, startTime.start_time);
      return {
        eventDateTime,
        weekday: event.weekday,
        sectionStart: event.start_section,
        sectionEnd: event.end_section,
        startTime: startTime.start_time,
        endTime: sectionTimes.find(t => t.section_no === event.end_section)?.end_time ?? '',
        name: course?.name ?? '',
        color: course?.color ?? '#6366f1',
        teacher: course?.teacher ?? '',
        location: event.location,
        sourceId: event.id,
      };
    }
    if (sourceType === 'annotation' && annotation) {
      const startTime = sectionTimes.find(t => t.section_no === annotation.section_no);
      if (!startTime) return null;
      const eventDateTime = computeEventDateTime(semester, currentWeek, annotation.weekday, startTime.start_time);
      return {
        eventDateTime,
        weekday: annotation.weekday,
        sectionStart: annotation.section_no,
        sectionEnd: annotation.section_no,
        startTime: startTime.start_time,
        endTime: sectionTimes.find(t => t.section_no === annotation.section_no)?.end_time ?? '',
        name: annotation.note || '备注',
        color: annotation.color,
        teacher: '',
        location: `第${annotation.section_no}节`,
        sourceId: annotation.id,
      };
    }
    return null;
  }, [sourceType, event, course, annotation, semester, currentWeek, sectionTimes]);

  // 提醒表单上报的待设置时间
  const [remindAtIso, setRemindAtIso] = useState<string | null>(null);
  // 已有提醒列表（由表单内添加/删除后刷新）
  const [listVersion, setListVersion] = useState(0);

  const existingReminders = useMemo(() => {
    if (!eventInfo) return [];
    return getCustomRemindersForSource(sourceType, eventInfo.sourceId);
  }, [eventInfo, sourceType, listVersion]);

  // 当 eventInfo 可用时初始化
  useEffect(() => {
    setListVersion((v) => v + 1);
  }, [eventInfo]);

  const handleAdd = useCallback(() => {
    if (!remindAtIso || !eventInfo) return;
    addCustomReminder({
      source_type: sourceType,
      source_id: eventInfo.sourceId,
      remind_at: remindAtIso,
    });
    setListVersion((v) => v + 1);
    onConfirm();
  }, [remindAtIso, eventInfo, sourceType, onConfirm]);

  if (!eventInfo) return null;

  return (
    <div className="custom-reminder-dialog">
      <h3>设置提醒</h3>

      {/* 事件信息 */}
      <div className="custom-reminder-course-info">
        <div className="custom-reminder-course-dot" style={{ backgroundColor: eventInfo.color }} />
        <div>
          <div className="custom-reminder-course-name">{eventInfo.name}</div>
          <div className="custom-reminder-course-detail">
            {WEEKDAY_LABELS[eventInfo.weekday]} · 第{eventInfo.sectionStart}
            {eventInfo.sectionEnd !== eventInfo.sectionStart ? `-${eventInfo.sectionEnd}` : ''}节
            · {eventInfo.startTime} - {eventInfo.endTime}
            {eventInfo.teacher && ` · ${eventInfo.teacher}`}
            {eventInfo.location && ` · ${eventInfo.location}`}
          </div>
        </div>
      </div>

      {/* 提醒设置（预设快捷/精确时间/已有提醒列表） */}
      <ReminderForm
        eventDateTime={eventInfo.eventDateTime}
        sourceType={sourceType}
        sourceId={eventInfo.sourceId}
        defaultEnabled
        showToggle={false}
        onReminderChange={setRemindAtIso}
        onRemindersChanged={() => setListVersion((v) => v + 1)}
        renderReminderDetail={(r) =>
          formatDiffLabel(eventInfo.eventDateTime.getTime() - new Date(r.remind_at).getTime())
        }
      />

      {/* 操作按钮 */}
      <div className="custom-reminder-actions">
        <button className="btn btn-sm" onClick={onCancel}>取消</button>
        <button className="btn btn-sm btn-primary" onClick={handleAdd} disabled={!remindAtIso}>
          {existingReminders.length > 0 ? '添加更多' : '添加提醒'}
        </button>
      </div>
    </div>
  );
}

/** 把毫秒差格式化为人类可读的提前时间 */
function formatDiffLabel(ms: number): string {
  if (ms <= 0) return '事件开始时';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  if (hours < 24) return remainMin > 0 ? `${hours}小时${remainMin}分钟前` : `${hours}小时前`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days}天${remainHours}小时前` : `${days}天前`;
}
