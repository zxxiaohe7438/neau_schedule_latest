import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Course } from '../domain/Course';
import type { CourseEvent } from '../domain/CourseEvent';
import type { CellAnnotation } from '../domain/CellAnnotation';
import type { Semester } from '../domain/Semester';
import type { SectionTime } from '../domain/SectionTime';
import { computeEventDateTime, formatDateTimeLocal } from '../utils/reminderUtils';
import {
  getCustomRemindersForSource,
  addCustomReminder,
  removeCustomReminder,
  type CustomReminder,
  type ReminderSourceType,
} from '../utils/customReminders';
import { WEEKDAY_LABELS } from '../utils/dateUtils';

/** 预设提前时间选项 */
const PRESET_LEAD_OPTIONS = [
  { label: '10分钟前', minutes: 10 },
  { label: '30分钟前', minutes: 30 },
  { label: '1小时前', minutes: 60 },
  { label: '2小时前', minutes: 120 },
  { label: '1天前', minutes: 1440 },
];

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

  // 时间边界
  const minDateTime = useMemo(() => {
    if (!eventInfo) return '';
    return formatDateTimeLocal(new Date(eventInfo.eventDateTime.getTime() - 2 * 24 * 60 * 60 * 1000));
  }, [eventInfo]);

  const maxDateTime = useMemo(() => {
    if (!eventInfo) return '';
    return formatDateTimeLocal(eventInfo.eventDateTime);
  }, [eventInfo]);

  // 默认提醒时间 = 事件前30分钟
  const defaultRemindTime = useMemo(() => {
    if (!eventInfo) return '';
    return formatDateTimeLocal(new Date(eventInfo.eventDateTime.getTime() - 30 * 60 * 1000));
  }, [eventInfo]);

  const [remindAt, setRemindAt] = useState('');
  const [existingReminders, setExistingReminders] = useState<CustomReminder[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(30);

  // 当 eventInfo 可用时初始化
  useEffect(() => {
    if (defaultRemindTime) {
      setRemindAt(defaultRemindTime);
    }
  }, [defaultRemindTime]);

  useEffect(() => {
    if (eventInfo) {
      setExistingReminders(getCustomRemindersForSource(sourceType, eventInfo.sourceId));
    }
  }, [eventInfo, sourceType]);

  // 点击预设按钮
  const handlePreset = useCallback(
    (minutes: number) => {
      if (!eventInfo) return;
      setSelectedPreset(minutes);
      const t = new Date(eventInfo.eventDateTime.getTime() - minutes * 60 * 1000);
      setRemindAt(formatDateTimeLocal(t));
    },
    [eventInfo]
  );

  // 手动修改时间时取消预设选中
  const handleTimeChange = useCallback((value: string) => {
    setRemindAt(value);
    setSelectedPreset(null);
  }, []);

  const refreshExisting = useCallback(() => {
    if (eventInfo) {
      setExistingReminders(getCustomRemindersForSource(sourceType, eventInfo.sourceId));
    }
  }, [eventInfo, sourceType]);

  const handleAdd = useCallback(() => {
    if (!remindAt || !eventInfo) return;
    addCustomReminder({
      source_type: sourceType,
      source_id: eventInfo.sourceId,
      remind_at: new Date(remindAt).toISOString(),
    });
    refreshExisting();
    onConfirm();
  }, [remindAt, eventInfo, sourceType, refreshExisting, onConfirm]);

  const handleRemove = useCallback(
    (reminder: CustomReminder) => {
      removeCustomReminder(reminder.source_type, reminder.source_id, reminder.remind_at);
      refreshExisting();
    },
    [refreshExisting]
  );

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

      {/* 预设快捷按钮 */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text, #1e293b)', marginBottom: 8, display: 'block' }}>
          快速选择
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRESET_LEAD_OPTIONS.map((opt) => (
            <button
              key={opt.minutes}
              className={`btn btn-sm ${selectedPreset === opt.minutes ? 'btn-primary' : ''}`}
              style={{ fontSize: 12 }}
              onClick={() => handlePreset(opt.minutes)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 精确时间选择 */}
      <div className="custom-reminder-form">
        <div className="custom-reminder-field">
          <label>精确时间</label>
          <input
            type="datetime-local"
            value={remindAt}
            min={minDateTime}
            max={maxDateTime}
            onChange={(e) => handleTimeChange(e.target.value)}
          />
          <p className="custom-reminder-hint">
            事件时间: {eventInfo.eventDateTime.toLocaleString('zh-CN')} · 可选前 2 天内
          </p>
        </div>
      </div>

      {/* 已有提醒 */}
      {existingReminders.length > 0 && (
        <div className="custom-reminder-existing">
          <h4>已设置的提醒</h4>
          {existingReminders.map((r, i) => {
            const remindDate = new Date(r.remind_at);
            const diffMs = eventInfo.eventDateTime.getTime() - remindDate.getTime();
            const diffLabel = formatDiffLabel(diffMs);
            return (
              <div key={i} className="custom-reminder-existing-item">
                <span>
                  {remindDate.toLocaleString('zh-CN')}
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary, #94a3b8)', marginLeft: 6 }}>
                    ({diffLabel})
                  </span>
                </span>
                <button onClick={() => handleRemove(r)}>删除</button>
              </div>
            );
          })}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="custom-reminder-actions">
        <button className="btn btn-sm" onClick={onCancel}>取消</button>
        <button className="btn btn-sm btn-primary" onClick={handleAdd} disabled={!remindAt}>
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
