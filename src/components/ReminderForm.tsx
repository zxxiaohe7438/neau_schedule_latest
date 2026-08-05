import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CustomReminder, ReminderSourceType } from '../utils/customReminders';
import { getCustomRemindersForSource, removeCustomReminder } from '../utils/customReminders';
import { formatDateTimeLocal, getReminderSettings } from '../utils/reminderUtils';
import { BellIcon } from './icons';

/** 预设提前时间选项 */
export const PRESET_LEAD_OPTIONS = [
  { label: '10分钟前', minutes: 10 },
  { label: '30分钟前', minutes: 30 },
  { label: '1小时前', minutes: 60 },
  { label: '2小时前', minutes: 120 },
  { label: '1天前', minutes: 1440 },
];

interface ReminderFormProps {
  eventDateTime: Date;
  sourceType: ReminderSourceType;
  sourceId: number;
  /** 默认开启提醒开关（用于无开关入口） */
  defaultEnabled?: boolean;
  /** 是否显示提醒开关（图标为铃铛） */
  showToggle?: boolean;
  /** 当前待设置的提醒时间变化回调（ISO 字符串；null 表示未启用） */
  onReminderChange?: (remindAtIso: string | null) => void;
  /** 已有提醒列表变化回调（添加/删除后触发） */
  onRemindersChanged?: () => void;
  /** 已有提醒条目的附加描述（如相对事件时间的差值标签） */
  renderReminderDetail?: (reminder: CustomReminder) => string;
}

/**
 * 提醒设置表单（预设提前时间 / 自定义时间 / 已有提醒列表）。
 * 收敛 CellNoteEditor 与 CustomReminderDialog 两套同构的提醒设置 UI。
 * 本组件只负责编辑与上报，添加提醒由调用方在合适时机执行。
 */
export function ReminderForm({
  eventDateTime,
  sourceType,
  sourceId,
  defaultEnabled = false,
  showToggle = true,
  onReminderChange,
  onRemindersChanged,
  renderReminderDetail,
}: ReminderFormProps) {
  const settings = useMemo(() => getReminderSettings(), []);
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [mode, setMode] = useState<'lead' | 'custom'>('lead');
  const [leadMinutes, setLeadMinutes] = useState(settings.defaultLeadMinutes);
  const [customTime, setCustomTime] = useState('');
  const [existingReminders, setExistingReminders] = useState<CustomReminder[]>([]);
  const [listVersion, setListVersion] = useState(0);

  // 默认自定义时间 = 事件前 30 分钟
  useEffect(() => {
    if (!customTime) {
      setCustomTime(formatDateTimeLocal(new Date(eventDateTime.getTime() - 30 * 60 * 1000)));
    }
  }, [eventDateTime, customTime]);

  // 加载已有提醒
  useEffect(() => {
    setExistingReminders(getCustomRemindersForSource(sourceType, sourceId));
  }, [sourceType, sourceId, listVersion]);

  // 点击预设按钮
  const handlePreset = useCallback((minutes: number) => {
    setEnabled(true);
    setMode('lead');
    setLeadMinutes(minutes);
  }, []);

  // 当前将设置的提醒时间
  const remindAt = useMemo(() => {
    if (!enabled) return null;
    if (mode === 'custom') {
      return customTime ? new Date(customTime) : null;
    }
    return new Date(eventDateTime.getTime() - leadMinutes * 60 * 1000);
  }, [enabled, mode, customTime, leadMinutes, eventDateTime]);

  // 上报提醒时间变化
  useEffect(() => {
    onReminderChange?.(remindAt ? remindAt.toISOString() : null);
  }, [remindAt, onReminderChange]);

  const handleRemove = useCallback(
    (reminder: CustomReminder) => {
      removeCustomReminder(reminder.source_type, reminder.source_id, reminder.remind_at);
      setListVersion((v) => v + 1);
      onRemindersChanged?.();
    },
    [onRemindersChanged]
  );

  const inputStyle = {
    padding: '4px 6px',
    border: '1px solid var(--color-border, #e2e8f0)',
    borderRadius: 4,
    fontSize: 13,
    background: 'var(--color-bg, #f8fafc)',
    color: 'var(--color-text, #1e293b)',
  };

  return (
    <div className="reminder-form">
      {showToggle && (
        <div className="form-group" style={{ marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <BellIcon size={14} /> 提醒
            </span>
            <label className="toggle-switch" style={{ marginLeft: 'auto' }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </label>
        </div>
      )}

      {enabled && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 预设快捷按钮 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESET_LEAD_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                className={`btn btn-sm ${mode === 'lead' && leadMinutes === opt.minutes ? 'btn-primary' : ''}`}
                style={{ fontSize: 12 }}
                onClick={() => handlePreset(opt.minutes)}
              >
                {opt.label}
              </button>
            ))}
          </div>

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
                checked={mode === 'lead'}
                onChange={() => setMode('lead')}
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
              disabled={mode !== 'lead'}
              style={{ ...inputStyle, width: 60, textAlign: 'center', opacity: mode === 'lead' ? 1 : 0.5 }}
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
                checked={mode === 'custom'}
                onChange={() => setMode('custom')}
              />
              自定义时间
            </label>
            <input
              type="datetime-local"
              value={customTime}
              min={formatDateTimeLocal(new Date(eventDateTime.getTime() - 2 * 24 * 60 * 60 * 1000))}
              max={formatDateTimeLocal(eventDateTime)}
              onChange={(e) => setCustomTime(e.target.value)}
              disabled={mode !== 'custom'}
              style={{ ...inputStyle, opacity: mode === 'custom' ? 1 : 0.5 }}
            />
          </div>

          {/* 提醒预览 */}
          {remindAt && (
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #94a3b8)' }}>
              将在 {remindAt.toLocaleString('zh-CN')} 提醒{' '}
              <span>(事件时间: {eventDateTime.toLocaleString('zh-CN')})</span>
            </div>
          )}
        </div>
      )}

      {/* 已有提醒列表 */}
      {existingReminders.length > 0 && (
        <div className="form-group" style={{ marginTop: 4 }}>
          <label style={{ fontSize: 13, color: 'var(--color-text-secondary, #64748b)' }}>
            已设置的提醒
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
                <span>
                  {new Date(r.remind_at).toLocaleString('zh-CN')}
                  {renderReminderDetail && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-secondary, #94a3b8)', marginLeft: 6 }}>
                      ({renderReminderDetail(r)})
                    </span>
                  )}
                </span>
                <button
                  className="btn btn-sm"
                  style={{ color: 'var(--color-danger, #ef4444)', fontSize: 12, padding: '2px 6px' }}
                  onClick={() => handleRemove(r)}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
