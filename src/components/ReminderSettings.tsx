import { useState, useCallback } from 'react';
import { getReminderSettings, saveReminderSettings, type ReminderSettings as ReminderSettingsType } from '../utils/reminderUtils';

interface ReminderSettingsProps {
  onBack: () => void;
  onTestToast?: (params: {
    courseName: string;
    courseColor: string;
    teacher: string;
    location: string;
    displaySeconds: number;
  }) => void;
}

export function ReminderSettingsPanel({ onBack, onTestToast }: ReminderSettingsProps) {
  const [settings, setSettings] = useState<ReminderSettingsType>(getReminderSettings);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const handleSave = useCallback(() => {
    saveReminderSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const update = useCallback((patch: Partial<ReminderSettingsType>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  }, []);

  const handleTest = useCallback(async () => {
    setTestResult('');

    // 系统通知
    if (settings.desktopNotification) {
      try {
        if (window.api.notification) {
          await window.api.notification.show({
            title: '🔔 测试通知',
            body: '桌面系统通知正常工作！',
          });
        }
      } catch { /* ignore */ }
    }

    // 应用内弹窗
    if (settings.appNotification && onTestToast) {
      onTestToast({
        courseName: '测试课程 — 高等数学',
        courseColor: '#6366f1',
        teacher: '张老师',
        location: '教学楼 301',
        displaySeconds: settings.displaySeconds,
      });
    }

    setTestResult('✅ 已发送');
  }, [settings, onTestToast]);

  return (
    <div className="reminder-settings">
      <h2>🔔 提醒设置</h2>

      {/* 总开关 */}
      <div className="reminder-setting-row">
        <div className="reminder-setting-label">
          <span>启用提醒</span>
          <span>开启后将在课程开始前自动提醒</span>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={settings.enabled} onChange={(e) => update({ enabled: e.target.checked })} />
          <span className="toggle-slider" />
        </label>
      </div>

      {settings.enabled && (
        <>
          {/* 桌面通知 */}
          <div className="reminder-setting-row">
            <div className="reminder-setting-label">
              <span>🖥️ 桌面通知</span>
              <span>Windows 系统通知（桌面右下角）</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={settings.desktopNotification} onChange={(e) => update({ desktopNotification: e.target.checked })} />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* 应用内弹窗 */}
          <div className="reminder-setting-row">
            <div className="reminder-setting-label">
              <span>💬 应用内弹窗</span>
              <span>软件窗口内居中弹窗</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={settings.appNotification} onChange={(e) => update({ appNotification: e.target.checked })} />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* 提前时间 */}
          <div className="reminder-setting-row">
            <div className="reminder-setting-label">
              <span>默认提前时间</span>
              <span>课程开始前多少分钟提醒</span>
            </div>
            <div className="reminder-setting-input">
              <input
                type="number"
                min={1}
                max={1440}
                value={settings.defaultLeadMinutes}
                onChange={(e) => {
                  const num = parseInt(e.target.value, 10);
                  if (!isNaN(num) && num >= 1 && num <= 1440) update({ defaultLeadMinutes: num });
                }}
              />
              <span>分钟</span>
            </div>
          </div>

          {/* 弹窗持续时间 */}
          <div className="reminder-setting-row">
            <div className="reminder-setting-label">
              <span>弹窗持续时间</span>
              <span>应用内弹窗显示多少秒后自动消失</span>
            </div>
            <div className="reminder-setting-input">
              <input
                type="number"
                min={1}
                max={300}
                value={settings.displaySeconds}
                onChange={(e) => {
                  const num = parseInt(e.target.value, 10);
                  if (!isNaN(num) && num >= 1 && num <= 300) update({ displaySeconds: num });
                }}
              />
              <span>秒</span>
            </div>
          </div>
        </>
      )}

      {/* 测试 */}
      <div className="reminder-setting-row">
        <div className="reminder-setting-label">
          <span>测试提醒</span>
          <span>按当前设置发送测试提醒</span>
        </div>
        <button className="btn btn-sm btn-primary" onClick={handleTest}>
          发送测试
        </button>
      </div>
      {testResult && (
        <div style={{ padding: '4px 0 8px', fontSize: 13, color: 'var(--color-success, #22c55e)' }}>
          {testResult}
        </div>
      )}

      <div className="reminder-settings-actions">
        <button className="btn btn-sm" onClick={onBack}>返回</button>
        <button className="btn btn-sm btn-primary" onClick={handleSave}>
          {saved ? '✓ 已保存' : '保存设置'}
        </button>
      </div>
    </div>
  );
}
