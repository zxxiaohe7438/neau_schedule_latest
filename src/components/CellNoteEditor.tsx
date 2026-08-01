import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { CellAnnotation, CellAnnotationCreateInput } from '../domain/CellAnnotation';
import type { Semester } from '../domain/Semester';
import type { SectionTime } from '../domain/SectionTime';
import { computeEventDateTime, formatDateTimeLocal, getReminderSettings } from '../utils/reminderUtils';
import {
  getCustomRemindersForSource,
  addCustomReminder,
  removeCustomReminder,
  type CustomReminder,
} from '../utils/customReminders';

interface CellNoteEditorProps {
  semesterId: number;
  weekday: number;
  sectionNo: number;
  currentWeek: number;
  existingAnnotation?: CellAnnotation;
  semester: Semester;
  sectionTimes: SectionTime[];
  onSave: (input: CellAnnotationCreateInput) => Promise<number | null>;
  onUpdate: (id: number, note: string, color: string) => void;
  onDelete: (id: number) => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  '#FFE082', // Yellow
  '#FFAB91', // Orange
  '#EF9A9A', // Red
  '#CE93D8', // Purple
  '#90CAF9', // Blue
  '#80CBC4', // Teal
  '#A5D6A7', // Green
  '#FFF59D', // Light Yellow
  '#B0BEC5', // Gray
];

export function CellNoteEditor({
  semesterId,
  weekday,
  sectionNo,
  currentWeek,
  existingAnnotation,
  semester,
  sectionTimes,
  onSave,
  onUpdate,
  onDelete,
  onCancel,
}: CellNoteEditorProps) {
  const [note, setNote] = useState(existingAnnotation?.note ?? '');
  const [color, setColor] = useState(existingAnnotation?.color ?? '#FFE082');
  const isMouseDownInside = useRef(false);

  // 提醒状态
  const settings = useMemo(() => getReminderSettings(), []);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [leadMinutes, setLeadMinutes] = useState(settings.defaultLeadMinutes);
  const [customTime, setCustomTime] = useState('');
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [existingReminders, setExistingReminders] = useState<CustomReminder[]>([]);

  // 计算节次时间
  const sectionTime = useMemo(
    () => sectionTimes.find((t) => t.section_no === sectionNo),
    [sectionTimes, sectionNo]
  );

  // 事件时间
  const eventDateTime = useMemo(() => {
    if (!sectionTime) return null;
    return computeEventDateTime(semester, currentWeek, weekday, sectionTime.start_time);
  }, [semester, currentWeek, weekday, sectionTime]);

  // 加载已有提醒
  useEffect(() => {
    if (existingAnnotation) {
      const reminders = getCustomRemindersForSource('annotation', existingAnnotation.id);
      setExistingReminders(reminders);
      if (reminders.length > 0) {
        setReminderEnabled(true);
      }
    }
  }, [existingAnnotation]);

  useEffect(() => {
    if (existingAnnotation) {
      setNote(existingAnnotation.note);
      setColor(existingAnnotation.color);
    }
  }, [existingAnnotation]);

  // 默认自定义时间 = 事件前30分钟
  useEffect(() => {
    if (eventDateTime && !customTime) {
      const def = new Date(eventDateTime.getTime() - 30 * 60 * 1000);
      setCustomTime(formatDateTimeLocal(def));
    }
  }, [eventDateTime, customTime]);

  const handleSave = async () => {
    if (existingAnnotation) {
      onUpdate(existingAnnotation.id, note, color);
      // 更新提醒
      saveReminders(existingAnnotation.id);
    } else {
      const newId = await onSave({
        semester_id: semesterId,
        weekday,
        section_no: sectionNo,
        start_week: currentWeek,
        end_week: currentWeek,
        week_pattern: 'all',
        note,
        color,
      });
      // 用新建备注的 ID 保存提醒
      if (newId) {
        saveReminders(newId);
      }
    }
  };

  const saveReminders = useCallback(
    (annotationId: number) => {
      if (!reminderEnabled || !eventDateTime) return;

      if (useCustomTime && customTime) {
        // 使用自定义时间
        const isoStr = new Date(customTime).toISOString();
        addCustomReminder({
          source_type: 'annotation',
          source_id: annotationId,
          remind_at: isoStr,
        });
      } else {
        // 使用默认提前时间
        const remindAt = new Date(
          eventDateTime.getTime() - leadMinutes * 60 * 1000
        );
        // 只在事件前才添加
        if (remindAt.getTime() < eventDateTime.getTime()) {
          addCustomReminder({
            source_type: 'annotation',
            source_id: annotationId,
            remind_at: remindAt.toISOString(),
          });
        }
      }
    },
    [reminderEnabled, eventDateTime, useCustomTime, customTime, leadMinutes]
  );

  const handleDeleteReminder = useCallback((reminder: CustomReminder) => {
    removeCustomReminder(reminder.source_type, reminder.source_id, reminder.remind_at);
    setExistingReminders((prev) =>
      prev.filter(
        (r) =>
          !(
            r.source_type === reminder.source_type &&
            r.source_id === reminder.source_id &&
            r.remind_at === reminder.remind_at
          )
      )
    );
  }, []);

  const handleDelete = () => {
    if (existingAnnotation) {
      onDelete(existingAnnotation.id);
    }
  };

  const weekdayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  const handleMouseDown = (e: React.MouseEvent) => {
    const editor = (e.currentTarget as HTMLElement).querySelector('.cell-note-editor');
    isMouseDownInside.current = editor?.contains(e.target as Node) ?? false;
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isMouseDownInside.current) {
      onCancel();
    }
  };

  // 计算提醒预览时间
  const previewRemindTime = useMemo(() => {
    if (!eventDateTime) return null;
    if (useCustomTime && customTime) {
      return new Date(customTime);
    }
    return new Date(eventDateTime.getTime() - leadMinutes * 60 * 1000);
  }, [eventDateTime, useCustomTime, customTime, leadMinutes]);

  return (
    <div className="cell-note-editor-overlay" onMouseDown={handleMouseDown} onClick={handleOverlayClick}>
      <div className="cell-note-editor">
        <div className="cell-note-editor-header">
          <h3>{existingAnnotation ? '编辑备注' : '添加备注'}</h3>
          <span className="cell-note-location">
            {weekdayNames[weekday]} 第{sectionNo}节
          </span>
        </div>

        <div className="cell-note-editor-body">
          <div className="form-group">
            <label>备注内容</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="输入备注内容..."
              rows={3}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>背景颜色</label>
            <div className="color-picker">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-swatch ${c === color ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* 提醒设置 */}
          <div className="form-group" style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔔 提醒</span>
              <label className="toggle-switch" style={{ marginLeft: 'auto' }}>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </label>

            {reminderEnabled && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 提前时间 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="radio"
                      name="reminder-mode"
                      checked={!useCustomTime}
                      onChange={() => setUseCustomTime(false)}
                    />
                    提前
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={2880}
                    value={leadMinutes}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 1 && v <= 2880) setLeadMinutes(v);
                    }}
                    disabled={useCustomTime}
                    style={{
                      width: 60,
                      padding: '4px 6px',
                      border: '1px solid var(--color-border, #e2e8f0)',
                      borderRadius: 4,
                      fontSize: 13,
                      textAlign: 'center',
                      background: 'var(--color-bg, #f8fafc)',
                      color: 'var(--color-text, #1e293b)',
                      opacity: useCustomTime ? 0.5 : 1,
                    }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary, #64748b)' }}>
                    分钟
                  </span>
                </div>

                {/* 自定义时间 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="radio"
                      name="reminder-mode"
                      checked={useCustomTime}
                      onChange={() => setUseCustomTime(true)}
                    />
                    自定义时间
                  </label>
                  <input
                    type="datetime-local"
                    value={customTime}
                    min={eventDateTime ? formatDateTimeLocal(new Date(eventDateTime.getTime() - 2 * 24 * 60 * 60 * 1000)) : ''}
                    max={eventDateTime ? formatDateTimeLocal(eventDateTime) : ''}
                    onChange={(e) => setCustomTime(e.target.value)}
                    disabled={!useCustomTime}
                    style={{
                      padding: '4px 6px',
                      border: '1px solid var(--color-border, #e2e8f0)',
                      borderRadius: 4,
                      fontSize: 13,
                      background: 'var(--color-bg, #f8fafc)',
                      color: 'var(--color-text, #1e293b)',
                      opacity: useCustomTime ? 1 : 0.5,
                    }}
                  />
                </div>

                {/* 提醒预览 */}
                {previewRemindTime && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #94a3b8)' }}>
                    将在 {previewRemindTime.toLocaleString('zh-CN')} 提醒
                    {eventDateTime && (
                      <span>
                        {' '}
                        (事件时间: {eventDateTime.toLocaleString('zh-CN')})
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 已有自定义提醒列表 */}
          {existingReminders.length > 0 && (
            <div className="form-group" style={{ marginTop: 4 }}>
              <label style={{ fontSize: 13, color: 'var(--color-text-secondary, #64748b)' }}>
                已设置的自定义提醒
              </label>
              <div
                style={{
                  marginTop: 6,
                  padding: '8px 10px',
                  background: 'var(--color-bg, #f8fafc)',
                  borderRadius: 8,
                }}
              >
                {existingReminders.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      fontSize: 13,
                    }}
                  >
                    <span>{new Date(r.remind_at).toLocaleString('zh-CN')}</span>
                    <button
                      className="btn btn-sm"
                      style={{ color: 'var(--color-danger, #ef4444)', fontSize: 12, padding: '2px 6px' }}
                      onClick={() => handleDeleteReminder(r)}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="cell-note-editor-actions">
          {existingAnnotation && (
            <button
              className="btn btn-danger"
              onClick={handleDelete}
            >
              删除
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!note.trim()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
