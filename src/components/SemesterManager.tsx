import { useState } from 'react';
import type { Semester, SemesterCreateInput } from '../domain/Semester';

interface Props {
  semesters: Semester[];
  onCreated: (semester: Semester) => void;
  onDeleted: (id: number) => void;
  onSeedMockData?: () => void;
  onExportBackup?: (semesterId: number) => void;
}

export function SemesterManager({ semesters, onCreated, onDeleted, onSeedMockData, onExportBackup }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SemesterCreateInput>({
    name: '',
    start_date: '',
    weeks_count: 18,
  });
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

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
    const confirmed = confirm(
      `确定要删除学期「${name}」吗？\n\n此操作将删除该学期下的所有课程和课时安排，且不可撤销。\n\n建议先导出备份。`
    );
    if (!confirmed) return;

    try {
      await window.api.semester.delete(id);
      onDeleted(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await window.api.semester.archive(id);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '归档失败');
    }
  };

  const handleUnarchive = async (id: number) => {
    try {
      await window.api.semester.unarchive(id);
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : '取消归档失败');
    }
  };

  const nonArchived = semesters.filter((s) => !s.is_archived);
  const archived = semesters.filter((s) => s.is_archived);

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

      {/* Active Semesters */}
      {nonArchived.length === 0 && archived.length === 0 ? (
        <div className="empty-state">
          <p>还没有创建任何学期</p>
          <p className="text-muted">点击上方「新建学期」开始</p>
        </div>
      ) : (
        <>
          {nonArchived.length > 0 && (
            <div className="semester-section">
              <h3>当前学期</h3>
              <div className="semester-list">
                {nonArchived.map((s) => (
                  <SemesterCard
                    key={s.id}
                    semester={s}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onDelete={handleDelete}
                    onExportBackup={onExportBackup}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Archived Semesters */}
          {archived.length > 0 && (
            <div className="semester-section">
              <div className="semester-section-header">
                <h3>归档学期</h3>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowArchived(!showArchived)}
                >
                  {showArchived ? '隐藏' : `显示 (${archived.length})`}
                </button>
              </div>
              {showArchived && (
                <div className="semester-list">
                  {archived.map((s) => (
                    <SemesterCard
                      key={s.id}
                      semester={s}
                      onArchive={handleArchive}
                      onUnarchive={handleUnarchive}
                      onDelete={handleDelete}
                      onExportBackup={onExportBackup}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SemesterCard({
  semester,
  onArchive,
  onUnarchive,
  onDelete,
  onExportBackup,
}: {
  semester: Semester;
  onArchive: (id: number) => void;
  onUnarchive: (id: number) => void;
  onDelete: (id: number, name: string) => void;
  onExportBackup?: (semesterId: number) => void;
}) {
  return (
    <div className={`semester-card ${semester.is_archived ? 'archived' : ''}`}>
      <div className="semester-card-info">
        <h3>{semester.name}</h3>
        <p>
          {semester.start_date} · {semester.weeks_count} 周
          {semester.is_archived && <span className="badge">已归档</span>}
        </p>
      </div>
      <div className="semester-card-actions">
        {onExportBackup && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => onExportBackup(semester.id)}
            title="导出备份"
          >
            备份
          </button>
        )}
        {semester.is_archived ? (
          <button
            className="btn btn-sm"
            onClick={() => onUnarchive(semester.id)}
          >
            取消归档
          </button>
        ) : (
          <button
            className="btn btn-sm"
            onClick={() => onArchive(semester.id)}
          >
            归档
          </button>
        )}
        <button
          className="btn btn-sm btn-danger"
          onClick={() => onDelete(semester.id, semester.name)}
        >
          删除
        </button>
      </div>
    </div>
  );
}
