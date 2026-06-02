import { useState } from 'react';
import type { ImportResult } from '../domain/ImportResult';

interface SmartPasteDialogProps {
  onConfirm: (result: ImportResult) => void;
  onCancel: () => void;
}

export function SmartPasteDialog({ onConfirm, onCancel }: SmartPasteDialogProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);

  const handleRecognize = async () => {
    if (!text.trim()) return;

    setIsRecognizing(true);
    try {
      const recognized = await window.api.import.importRecognizeText(text);
      setResult(recognized);
    } catch (err) {
      alert(err instanceof Error ? err.message : '识别失败');
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleConfirm = () => {
    if (result) {
      onConfirm(result);
    }
  };

  const weekdayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    <div className="smart-paste-overlay" onClick={onCancel}>
      <div className="smart-paste-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="smart-paste-header">
          <h3>智能粘贴</h3>
          <p className="text-muted">粘贴包含考试时间、课程信息的文本，自动识别并导入</p>
        </div>

        <div className="smart-paste-body">
          <div className="form-group">
            <label>粘贴文本</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`示例格式：
6月15日(周一) 14:00-16:00 数据库原理 成栋楼A101
周一 第1-2节 数据库原理与应用 张老师 成栋楼A101 1-16周
下周一上午有数据库考试，在成栋楼A101`}
              rows={6}
              autoFocus
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleRecognize}
            disabled={!text.trim() || isRecognizing}
          >
            {isRecognizing ? '识别中...' : '开始识别'}
          </button>

          {result && (
            <div className="smart-paste-result">
              <div className="smart-paste-summary">
                <span className="summary-item success">
                  识别到 {result.courses.length} 个日程
                </span>
                {result.errors.length > 0 && (
                  <span className="summary-item warning">
                    {result.errors.length} 行无法识别
                  </span>
                )}
              </div>

              {result.courses.length > 0 && (
                <div className="smart-paste-preview">
                  <h4>识别结果</h4>
                  <div className="recognized-items">
                    {result.courses.map((course, idx) => (
                      <div key={idx} className="recognized-item">
                        <div className="recognized-item-name">{course.course_name}</div>
                        <div className="recognized-item-details">
                          {weekdayNames[course.event.weekday]}{' '}
                          第{course.event.start_section}-{course.event.end_section}节
                          {course.event.location && ` · ${course.event.location}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="smart-paste-errors">
                  <h4>无法识别的行</h4>
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="error-item">
                      <span className="error-message">{err.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="smart-paste-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          {result && result.courses.length > 0 && (
            <button className="btn btn-primary" onClick={handleConfirm}>
              确认导入
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
