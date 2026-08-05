import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Semester } from '../domain/Semester';
import type { Course } from '../domain/Course';
import type { CourseEvent } from '../domain/CourseEvent';
import type { CellAnnotationCreateInput } from '../domain/CellAnnotation';
import { SemesterManager } from '../components/SemesterManager';
import { SemesterSwitcher } from '../components/SemesterSwitcher';
import { TimetableGrid } from '../components/TimetableGrid';
import { CourseListView } from '../components/CourseListView';
import { CourseEditor } from '../components/CourseEditor';
import { ImportPreview } from '../components/ImportPreview';
import { CellNoteEditor } from '../components/CellNoteEditor';
import { SmartPasteDialog } from '../components/SmartPasteDialog';
import { SchoolFetchDialog } from '../components/SchoolFetchDialog';
import { Modal } from '../components/Modal';
import { ReminderToast } from '../components/ReminderToast';
import { TitleBar } from '../components/TitleBar';
import { ReminderSettingsPanel } from '../components/ReminderSettings';
import { CustomReminderDialog } from '../components/CustomReminderDialog';
import { SunIcon, MoonIcon, GearIcon } from '../components/icons';
import { useReminderScheduler } from '../hooks/useReminderScheduler';
import { useScheduleData } from '../hooks/useScheduleData';
import { useImportFlow } from '../hooks/useImportFlow';
import { useCourseEditing } from '../hooks/useCourseEditing';
import { getCustomReminders } from '../utils/customReminders';

type View = 'home' | 'timetable' | 'list' | 'import' | 'edit' | 'settings';

export function App() {
  const [view, setView] = useState<View>('home');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  const schedule = useScheduleData();

  // 课程/事件编辑状态
  const editing = useCourseEditing({
    view,
    onDataChanged: schedule.reloadActiveSemesterData,
    onExitEditView: () => setView('list'),
  });

  // 导入状态机
  const importFlow = useImportFlow({
    onOpenPreview: () => setView('import'),
    onClosePreview: () => setView('timetable'),
    onImported: async (semester) => {
      try {
        if (semester) {
          // 刷新学期列表（导入可能同步了学期日期），再切到目标学期
          await schedule.reloadSemesters();
          schedule.selectSemester(semester.id);
        }
      } catch (err) {
        console.error('Failed to refresh after import:', err);
      }
      setView('timetable');
    },
  });

  // Cell annotation state
  const [editingCell, setEditingCell] = useState<{ weekday: number; sectionNo: number } | null>(null);

  // Smart paste state
  const [showSmartPaste, setShowSmartPaste] = useState(false);

  // School website fetch state
  const [showSchoolFetch, setShowSchoolFetch] = useState(false);

  // Custom reminder dialog state
  const [reminderDialogEvent, setReminderDialogEvent] = useState<CourseEvent | null>(null);
  const [reminderDialogCourse, setReminderDialogCourse] = useState<Course | null>(null);
  // 用于刷新提醒标记
  const [reminderVersion, setReminderVersion] = useState(0);

  // 计算有提醒的事件 ID 集合
  const eventIdsWithReminders = useMemo(() => {
    const reminders = getCustomReminders();
    return new Set(
      reminders.filter(r => r.source_type === 'event').map(r => r.source_id)
    );
  }, [reminderVersion]);

  // Toggle dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  // 初载完成且有学期时进入课表视图
  useEffect(() => {
    if (!schedule.loading && schedule.activeSemesterId !== null) {
      setView('timetable');
    }
  }, [schedule.loading, schedule.activeSemesterId]);

  const handleSemesterCreated = useCallback(
    (semester: Semester) => {
      schedule.addSemester(semester);
      setView('timetable');
    },
    [schedule]
  );

  const handleSemesterDeleted = useCallback(
    (id: number) => {
      schedule.removeSemester(id);
      if (schedule.activeSemesterId === id) {
        setView('home');
      }
    },
    [schedule]
  );

  const handleSelectSemester = useCallback(
    (id: number) => {
      schedule.selectSemester(id);
      setView('timetable');
    },
    [schedule]
  );

  // Backup handlers
  const handleExportBackup = useCallback(async (semesterId: number) => {
    try {
      const filePath = await window.api.backup.exportTo(semesterId);
      if (filePath) {
        alert(`备份已导出到：\n${filePath}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '导出备份失败');
    }
  }, []);

  const handleRestoreBackup = useCallback(async () => {
    try {
      // 恢复前自动备份当前数据
      await window.api.backup.autoBackup();
      const result = await window.api.backup.importJson();
      if (result.success) {
        alert(result.message);
        await schedule.reloadSemesters();
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '恢复备份失败');
    }
  }, [schedule]);

  // 课表/列表入口
  const handleEditEvent = useCallback(
    (event: CourseEvent) => {
      editing.openEvent(event, schedule.courses);
      setView('edit');
    },
    [editing, schedule.courses]
  );

  const handleEditCourse = useCallback(
    (course: Course) => {
      editing.openCourse(course, schedule.events);
      setView('edit');
    },
    [editing, schedule.events]
  );

  // Cell annotation handlers
  const handleEmptyCellDoubleClick = useCallback(
    (weekday: number, sectionNo: number) => {
      setEditingCell({ weekday, sectionNo });
    },
    []
  );

  const handleSaveAnnotation = useCallback(
    async (input: CellAnnotationCreateInput): Promise<number | null> => {
      const createdId = await schedule.saveAnnotation(input);
      setEditingCell(null);
      return createdId;
    },
    [schedule]
  );

  const handleUpdateAnnotation = useCallback(
    async (id: number, note: string, color: string) => {
      await schedule.updateAnnotation(id, note, color);
      setEditingCell(null);
    },
    [schedule]
  );

  const handleDeleteAnnotation = useCallback(
    async (id: number) => {
      await schedule.deleteAnnotation(id);
      setEditingCell(null);
    },
    [schedule]
  );

  // Custom reminder handler
  const handleSetReminder = useCallback(
    (event: CourseEvent, course: Course) => {
      setReminderDialogEvent(event);
      setReminderDialogCourse(course);
    },
    []
  );

  const activeSemester = schedule.activeSemester;

  // 提醒调度
  const { toasts, dismissToast, addTestToast } = useReminderScheduler({
    semesters: schedule.semesters,
    activeSemesterId: schedule.activeSemesterId,
    courses: schedule.courses,
    events: schedule.events,
    sectionTimes: schedule.sectionTimes,
    cellAnnotations: schedule.cellAnnotations,
  });

  if (schedule.loading) {
    return (
      <div className="app-loading">
        <h1>NEAU Local Schedule</h1>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* 自绘窗口标题栏（frameless） */}
      <TitleBar />
      {/* Hidden file inputs for import */}
      <input
        ref={importFlow.fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={importFlow.handleFileChange}
      />

      <header className="app-header">
        <h1 className="app-title" onClick={() => setView('home')}>
          NEAU Local Schedule
        </h1>
        <button
          className="btn btn-sm btn-ghost dark-mode-toggle"
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
          aria-label={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {isDarkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
        {schedule.semesters.length > 0 && (
          <SemesterSwitcher
            semesters={schedule.semesters}
            activeId={schedule.activeSemesterId}
            onSelect={handleSelectSemester}
          />
        )}
        {view !== 'import' && (
          <div className="header-actions">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setView('settings')}
              title="设置提醒"
              aria-label="设置提醒"
            >
              <GearIcon size={16} />
            </button>
            <button className="btn btn-sm btn-ghost" onClick={importFlow.handleImportClick}>
              导入 JSON
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowSchoolFetch(true)} title="登录学校教务系统并获取本学期课表">
              官网获取
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowSmartPaste(true)} title="粘贴文本自动识别考试时间等信息">
              智能粘贴
            </button>
          </div>
        )}
        {/* 学期管理页（home）也显示视图标签，保证能切回周课表/课程列表 */}
        {view !== 'import' && schedule.activeSemesterId && (
          <nav className="view-tabs">
            <button
              className={`view-tab ${view === 'timetable' ? 'active' : ''}`}
              onClick={() => setView('timetable')}
            >
              周课表
            </button>
            <button
              className={`view-tab ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              课程列表
            </button>
          </nav>
        )}
      </header>
      <main className="app-main">
        {view === 'settings' ? (
          <ReminderSettingsPanel
            onBack={() => setView(schedule.activeSemesterId ? 'timetable' : 'home')}
            onTestToast={addTestToast}
          />
        ) : view === 'import' && importFlow.importResult ? (
          <ImportPreview
            result={importFlow.importResult}
            onConfirm={importFlow.confirmImport}
            onCancel={importFlow.cancelImport}
          />
        ) : view === 'home' || !schedule.activeSemesterId ? (
          <SemesterManager
            semesters={schedule.semesters}
            onCreated={handleSemesterCreated}
            onDeleted={handleSemesterDeleted}
            onSeedMockData={window.api.dev ? schedule.seedMockData : undefined}
            onClearAllData={schedule.clearAllData}
            onExportBackup={handleExportBackup}
            onRestoreBackup={handleRestoreBackup}
          />
        ) : view === 'timetable' && activeSemester ? (
          <TimetableGrid
            semester={activeSemester}
            courses={schedule.courses}
            events={schedule.events}
            sectionTimes={schedule.sectionTimes}
            currentWeek={schedule.currentWeek}
            unscheduledCourses={schedule.unscheduledCourses}
            cellAnnotations={schedule.cellAnnotations}
            eventIdsWithReminders={eventIdsWithReminders}
            onWeekChange={schedule.setCurrentWeek}
            onEventDoubleClick={editing.openFromTimetable}
            onCourseDoubleClick={handleEditCourse}
            onEmptyCellDoubleClick={handleEmptyCellDoubleClick}
            onDeleteAnnotation={handleDeleteAnnotation}
            onSetReminder={handleSetReminder}
            onClearSchedule={schedule.clearSchedule}
          />
        ) : view === 'edit' && editing.editingCourse ? (
          <CourseEditor
            course={editing.editingCourse}
            event={editing.editingEvent ?? undefined}
            onSave={editing.save}
            onCancel={editing.cancel}
          />
        ) : view === 'list' ? (
          <CourseListView
            courses={schedule.courses}
            events={schedule.events}
            onDeleteEvent={schedule.deleteEvent}
            onDeleteCourse={schedule.deleteCourse}
            onEditEvent={handleEditEvent}
            onEditCourse={handleEditCourse}
          />
        ) : null}
      </main>

      {/* Edit Modal for double-click on timetable */}
      <Modal
        isOpen={editing.showEditModal}
        onClose={editing.cancel}
        title="编辑课程"
      >
        {editing.editingCourse && (
          <CourseEditor
            course={editing.editingCourse}
            event={editing.editingEvent ?? undefined}
            onSave={editing.save}
            onCancel={editing.cancel}
          />
        )}
      </Modal>

      {/* Smart Paste Dialog */}
      {showSmartPaste && (
        <SmartPasteDialog
          onConfirm={importFlow.handleSmartPasteConfirm}
          onCancel={() => setShowSmartPaste(false)}
        />
      )}

      {/* School Fetch Dialog */}
      {showSchoolFetch && (
        <SchoolFetchDialog
          onResult={importFlow.handleSmartPasteConfirm}
          onCancel={() => setShowSchoolFetch(false)}
        />
      )}

      {/* Cell Note Editor */}
      {editingCell && schedule.activeSemesterId && activeSemester && (
        <CellNoteEditor
          semesterId={schedule.activeSemesterId}
          weekday={editingCell.weekday}
          sectionNo={editingCell.sectionNo}
          currentWeek={schedule.currentWeek}
          existingAnnotation={
            schedule.cellAnnotations.find(
              (a) =>
                a.weekday === editingCell.weekday &&
                a.section_no === editingCell.sectionNo &&
                a.start_week <= schedule.currentWeek &&
                a.end_week >= schedule.currentWeek
            )
          }
          semester={activeSemester}
          sectionTimes={schedule.sectionTimes}
          onSave={handleSaveAnnotation}
          onUpdate={handleUpdateAnnotation}
          onDelete={handleDeleteAnnotation}
          onCancel={() => setEditingCell(null)}
        />
      )}

      {/* Custom Reminder Dialog */}
      {reminderDialogEvent && reminderDialogCourse && activeSemester && (
        <Modal
          isOpen={true}
          onClose={() => {
            setReminderDialogEvent(null);
            setReminderDialogCourse(null);
          }}
          title="设置提醒"
        >
          <CustomReminderDialog
            sourceType="event"
            course={reminderDialogCourse}
            event={reminderDialogEvent}
            semester={activeSemester}
            currentWeek={schedule.currentWeek}
            sectionTimes={schedule.sectionTimes}
            onConfirm={() => {
              setReminderDialogEvent(null);
              setReminderDialogCourse(null);
              setReminderVersion(v => v + 1);
            }}
            onCancel={() => {
              setReminderDialogEvent(null);
              setReminderDialogCourse(null);
            }}
          />
        </Modal>
      )}

      {/* Reminder Toast Notifications */}
      <ReminderToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
