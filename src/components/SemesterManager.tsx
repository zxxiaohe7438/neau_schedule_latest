import { useState } from 'react';
import type { Semester, SemesterCreateInput } from '../domain/Semester';

interface Props {
  semesters: Semester[];
  onCreated: (semester: Semester) => void;
  onDeleted: (id: number) => void;
  onSeedMockData?: () => void;
}

export function SemesterManager({ semesters, onCreated, onDeleted, onSeedMockData }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SemesterCreateInput>({
    name: '',
    start_date: '',
    weeks_count: 18,
  });
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('请输入学期名称');
      return;
    }
    if (!form.start_date) {
      setError('请选择开始日期');
      return;
    }
    if (form.weeks_count < 1 || form.weeks_count > 30) {
      setError('周数应在 1-30 之间');
      return;
    }

    try {
      const semester = await window.api.semester.create(form);
      onCreated(semester);
      setForm({ name: '', start_date: '', weeks_count: 18 });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确定要删除学期「${name}」吗？此操作不可撤销。`)) return;
    try {
      await window.api.semester.delete(id);
      onDeleted(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div className="semester-manager">
      <div className="semester-manager-header">
        <h2>学期管理</h2>
        <div className="semester-manager-actions">
          {onSeedMockData && (
            <button className="btn btn-secondary" onClick={onSeedMockData}>
              加载测试数据
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '取消' : '+ 新建学期'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="semester-form">
          <div className="form-group">
            <label>学期名称</label>
            <input
              type="text"
              placeholder="例如：2025-2026-2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>开始日期</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>总周数</label>
            <input
              type="number"
              min={1}
              max={30}
              value={form.weeks_count}
              onChange={(e) =>
                setForm((f) => ({ ...f, weeks_count: Number(e.target.value) }))
              }
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" onClick={handleCreate}>
            创建
          </button>
        </div>
      )}

      {semesters.length === 0 ? (
        <div className="empty-state">
          <p>还没有创建任何学期</p>
          <p className="text-muted">点击上方「新建学期」开始</p>
        </div>
      ) : (
        <div className="semester-list">
          {semesters.map((s) => (
            <div key={s.id} className={`semester-card ${s.is_archived ? 'archived' : ''}`}>
              <div className="semester-card-info">
                <h3>{s.name}</h3>
                <p>
                  {s.start_date} · {s.weeks_count} 周
                  {s.is_archived && <span className="badge">已归档</span>}
                </p>
              </div>
              <div className="semester-card-actions">
                {!s.is_archived && (
                  <button
                    className="btn btn-sm"
                    onClick={async () => {
                      await window.api.semester.archive(s.id);
                      // Reload
                      window.location.reload();
                    }}
                  >
                    归档
                  </button>
                )}
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(s.id, s.name)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
