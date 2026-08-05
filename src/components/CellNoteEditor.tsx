import { useState, useEffect, useRef, useMemo } from 'react';
import type { CellAnnotation, CellAnnotationCreateInput } from '../domain/CellAnnotation';
import type { Semester } from '../domain/Semester';
import type { SectionTime } from '../domain/SectionTime';
import { computeEventDateTime } from '../utils/reminderUtils';
import { addCustomReminder } from '../utils/customReminders';
import { WEEKDAY_LABELS } from '../utils/dateUtils';
import { useMouseDownOutside } from '../hooks/useMouseDownOutside';
import { ReminderForm } from './ReminderForm';

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
  const { handleMouseDown, handleOverlayClick } = useMouseDownOutside('.cell-note-editor', onCancel);
  // 提醒表单上报的待设置提醒时间（保存备注时写入）
  const pendingReminderRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (existingAnnotation) {
      setNote(existingAnnotation.note);
      setColor(existingAnnotation.color);
    }
  }, [existingAnnotation]);

  const saveReminder = (annotationId: number) => {
    const remindAt = pendingReminderRef.current;
    if (!remindAt) return;
    addCustomReminder({
      source_type: 'annotation',
      source_id: annotationId,
      remind_at: remindAt,
    });
  };

  const handleSave = async () => {
    if (existingAnnotation) {
      onUpdate(existingAnnotation.id, note, color);
      saveReminder(existingAnnotation.id);
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
        saveReminder(newId);
      }
    }
  };

  const handleDelete = () => {
    if (existingAnnotation) {
      onDelete(existingAnnotation.id);
    }
  };

  return (
    <div className="cell-note-editor-overlay" onMouseDown={handleMouseDown} onClick={handleOverlayClick}>
      <div className="cell-note-editor">
        <div className="cell-note-editor-header">
          <h3>{existingAnnotation ? '编辑备注' : '添加备注'}</h3>
          <span className="cell-note-location">
            {WEEKDAY_LABELS[weekday]} 第{sectionNo}节
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

          {/* 提醒设置（预设/自定义时间/已有提醒列表） */}
          {eventDateTime && (
            <ReminderForm
              eventDateTime={eventDateTime}
              sourceType="annotation"
              sourceId={existingAnnotation?.id ?? 0}
              onReminderChange={(iso) => {
                pendingReminderRef.current = iso;
              }}
            />
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
