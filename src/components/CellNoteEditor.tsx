import { useState, useEffect } from 'react';
import type { CellAnnotation, CellAnnotationCreateInput } from '../domain/CellAnnotation';

interface CellNoteEditorProps {
  semesterId: number;
  weekday: number;
  sectionNo: number;
  currentWeek: number;
  existingAnnotation?: CellAnnotation;
  onSave: (input: CellAnnotationCreateInput) => void;
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
  onSave,
  onUpdate,
  onDelete,
  onCancel,
}: CellNoteEditorProps) {
  const [note, setNote] = useState(existingAnnotation?.note ?? '');
  const [color, setColor] = useState(existingAnnotation?.color ?? '#FFE082');

  useEffect(() => {
    if (existingAnnotation) {
      setNote(existingAnnotation.note);
      setColor(existingAnnotation.color);
    }
  }, [existingAnnotation]);

  const handleSave = () => {
    if (existingAnnotation) {
      onUpdate(existingAnnotation.id, note, color);
    } else {
      onSave({
        semester_id: semesterId,
        weekday,
        section_no: sectionNo,
        start_week: currentWeek,
        end_week: currentWeek,
        week_pattern: 'all',
        note,
        color,
      });
    }
  };

  const handleDelete = () => {
    if (existingAnnotation) {
      onDelete(existingAnnotation.id);
    }
  };

  const weekdayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    <div className="cell-note-editor-overlay" onClick={onCancel}>
      <div className="cell-note-editor" onClick={(e) => e.stopPropagation()}>
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
