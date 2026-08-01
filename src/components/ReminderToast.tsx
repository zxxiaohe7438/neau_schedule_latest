import { useEffect, useState } from 'react';

export interface ToastItem {
  id: string;
  courseName: string;
  courseColor: string;
  teacher: string;
  location: string;
  eventTime: Date;
  displaySeconds: number;
}

interface ReminderToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ReminderToast({ toasts, onDismiss }: ReminderToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="reminder-toast-container">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, toast.displaySeconds * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, toast.displaySeconds]);

  const handleDismiss = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  const timeStr = toast.eventTime.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`reminder-toast ${exiting ? 'reminder-toast-exit' : ''}`}
      onClick={handleDismiss}
      style={{ cursor: 'pointer' }}
    >
      {/* 顶部颜色头 */}
      <div className="reminder-toast-header" style={{ background: `linear-gradient(135deg, ${toast.courseColor}, ${toast.courseColor}cc)` }}>
        <span className="reminder-toast-bell">🔔</span>
        <span className="reminder-toast-header-text">即将上课</span>
        <button className="reminder-toast-close" onClick={(e) => { e.stopPropagation(); handleDismiss(); }} title="关闭">✕</button>
      </div>

      {/* 内容区 */}
      <div className="reminder-toast-content">
        <div className="reminder-toast-title">{toast.courseName}</div>
        <div className="reminder-toast-info">
          {toast.teacher && (
            <div className="reminder-toast-info-row">
              <span className="reminder-toast-info-icon">👤</span>
              <span>{toast.teacher}</span>
            </div>
          )}
          {toast.location && (
            <div className="reminder-toast-info-row">
              <span className="reminder-toast-info-icon">📍</span>
              <span>{toast.location}</span>
            </div>
          )}
          <div className="reminder-toast-info-row">
            <span className="reminder-toast-info-icon">🕐</span>
            <span>{timeStr} 开始</span>
          </div>
        </div>
      </div>

      {/* 底部进度条 */}
      <div className="reminder-toast-progress">
        <div
          className="reminder-toast-progress-bar"
          style={{
            backgroundColor: toast.courseColor,
            animationDuration: `${toast.displaySeconds}s`,
          }}
        />
      </div>
    </div>
  );
}
