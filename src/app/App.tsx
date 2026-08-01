import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Semester } from '../domain/Semester';
import type { Course } from '../domain/Course';
import type { CourseEvent } from '../domain/CourseEvent';
import type { SectionTime } from '../domain/SectionTime';
import type { ImportResult } from '../domain/ImportResult';
import type { CellAnnotation, CellAnnotationCreateInput } from '../domain/CellAnnotation';
import { SemesterManager } from '../components/SemesterManager';
import { SemesterSwitcher } from '../components/SemesterSwitcher';
import { TimetableGrid } from '../components/TimetableGrid';
import { CourseListView } from '../components/CourseListView';
import { CourseEditor } from '../components/CourseEditor';
import { ImportPreview } from '../components/ImportPreview';
import { CellNoteEditor } from '../components/CellNoteEditor';
import { SmartPasteDialog } from '../components/SmartPasteDialog';
import { Modal } from '../components/Modal';
import { ReminderToast } from '../components/ReminderToast';
import { ReminderSettingsPanel } from '../components/ReminderSettings';
import { CustomReminderDialog } from '../components/CustomReminderDialog';
import { useReminderScheduler } from '../hooks/useReminderScheduler';
import { getCustomReminders } from '../utils/customReminders';
import { getWeekNumber } from '../utils/dateUtils';

type View = 'home' | 'timetable' | 'list' | 'import' | 'edit' | 'settings';

export function App() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('home');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  // Data for active semester
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<CourseEvent[]>([]);
  const [sectionTimes, setSectionTimes] = useState<SectionTime[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [unscheduledCourses, setUnscheduledCourses] = useState<Course[]>([]);

  // Import state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingEvent, setEditingEvent] = useState<CourseEvent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Cell annotation state
  const [cellAnnotations, setCellAnnotations] = useState<CellAnnotation[]>([]);
  const [editingCell, setEditingCell] = useState<{ weekday: number; sectionNo: number } | null>(null);

  // Smart paste state
  const [showSmartPaste, setShowSmartPaste] = useState(false);

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

  const loadSemesters = useCallback(async () => {
    try {
      const list = await window.api.semester.list();
      setSemesters(list);
      // Auto-select first non-archived semester
      const active = list.find((s) => !s.is_archived);
      if (active) {
        setActiveSemesterId(active.id);
        setView('timetable');
      }
    } catch (err) {
      console.error('Failed to load semesters:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  // Load semester data when active semester changes
  useEffect(() => {
    if (!activeSemesterId) {
      setCourses([]);
      setEvents([]);
      setSectionTimes([]);
      setUnscheduledCourses([]);
      return;
    }

    const loadSemesterData = async () => {
      try {
        const [courseList, eventList, timeList, annotationList] = await Promise.all([
          window.api.course.listBySemester(activeSemesterId),
          window.api.courseEvent.listBySemester(activeSemesterId),
          window.api.sectionTime.listBySemester(activeSemesterId),
          window.api.cellAnnotation.listBySemester(activeSemesterId),
        ]);
        setCourses(courseList);
        setEvents(eventList);
        setSectionTimes(timeList);
        setCellAnnotations(annotationList);

        // Find unscheduled courses (courses without events)
        const courseIdsWithEvents = new Set(eventList.map(e => e.course_id));
        const unscheduled = courseList.filter(c => !courseIdsWithEvents.has(c.id));
        setUnscheduledCourses(unscheduled);

        // Calculate current week based on today's date
        const semester = semesters.find((s) => s.id === activeSemesterId);
        if (semester) {
          const week = getWeekNumber(new Date(), semester.start_date);
          const clamped = Math.max(1, Math.min(week, semester.weeks_count));
          setCurrentWeek(clamped > 0 ? clamped : 1);
        }
      } catch (err) {
        console.error('Failed to load semester data:', err);
      }
    };

    loadSemesterData();
  }, [activeSemesterId, semesters]);

  const handleSemesterCreated = useCallback(
    (semester: Semester) => {
      setSemesters((prev) => [semester, ...prev]);
      setActiveSemesterId(semester.id);
      setView('timetable');
    },
    []
  );

  const handleSemesterDeleted = useCallback(
    (id: number) => {
      setSemesters((prev) => prev.filter((s) => s.id !== id));
      if (activeSemesterId === id) {
        setActiveSemesterId(null);
        setView('home');
      }
    },
    [activeSemesterId]
  );

  const handleSelectSemester = useCallback((id: number) => {
    setActiveSemesterId(id);
    setView('timetable');
  }, []);

  const handleSeedMockData = useCallback(async () => {
    try {
      if (!window.api.dev) {
        console.error('Dev API not available');
        return;
      }
      const semester = await window.api.dev.seed();
      setSemesters((prev) => [semester, ...prev]);
      setActiveSemesterId(semester.id);
      setView('timetable');
    } catch (err) {
      console.error('Failed to seed mock data:', err);
    }
  }, []);

  const handleClearAllData = useCallback(async () => {
    try {
      if (!window.api.dev) {
        console.error('Dev API not available');
        return;
      }
      await window.api.dev.clearAll();
      setSemesters([]);
      setActiveSemesterId(null);
      setCourses([]);
      setEvents([]);
      setSectionTimes([]);
      setUnscheduledCourses([]);
      setView('home');
    } catch (err) {
      console.error('Failed to clear all data:', err);
    }
  }, []);

  const handleDeleteEvent = useCallback(
    async (eventId: number) => {
      try {
        await window.api.courseEvent.delete(eventId);
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      } catch (err) {
        console.error('Failed to delete event:', err);
      }
    },
    []
  );

  const handleDeleteCourse = useCallback(
    async (courseId: number) => {
      try {
        await window.api.course.delete(courseId);
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        setEvents((prev) => prev.filter((e) => e.course_id !== courseId));
      } catch (err) {
        console.error('Failed to delete course:', err);
      }
    },
    []
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
        await loadSemesters();
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '恢复备份失败');
    }
  }, [loadSemesters]);

  // Import handlers
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await window.api.import.importJson(data);
        setImportResult(result);
        setView('import');
      } catch (err) {
        alert(err instanceof Error ? err.message : '导入失败');
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    []
  );

  const handleImportConfirm = useCallback(async (updatedResult: ImportResult) => {
    try {
      await window.api.import.confirmImport(updatedResult);
      setImportResult(null);
      setView('timetable');
      // Reload semester list
      const list = await window.api.semester.list();
      setSemesters(list);
      // Find the semester we just imported to
      const importedSemester = list.find(s => s.name === updatedResult.semester.name);
      if (importedSemester) {
        setActiveSemesterId(importedSemester.id);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '导入确认失败');
    }
  }, []);

  const handleImportCancel = useCallback(() => {
    setImportResult(null);
    setView('timetable');
  }, []);

  // Edit handlers
  const handleEditEvent = useCallback(
    (event: CourseEvent) => {
      const course = courses.find((c) => c.id === event.course_id);
      if (course) {
        setEditingCourse(course);
        setEditingEvent(event);
        setView('edit');
      }
    },
    [courses]
  );

  const handleEditCourse = useCallback(
    (course: Course) => {
      // Find first event for this course
      const event = events.find((e) => e.course_id === course.id);
      setEditingCourse(course);
      setEditingEvent(event ?? null);
      setView('edit');
    },
    [events]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveEdit = useCallback(
    async (courseData: any, eventData?: any) => {
      if (!editingCourse) return;

      try {
        // Update course
        if (Object.keys(courseData).length > 0) {
          await window.api.course.update(editingCourse.id, courseData);
        }

        // Update event
        if (editingEvent && eventData && Object.keys(eventData).length > 0) {
          await window.api.courseEvent.update(editingEvent.id, eventData);
        }

        // Reload data
        if (activeSemesterId) {
          const [courseList, eventList] = await Promise.all([
            window.api.course.listBySemester(activeSemesterId),
            window.api.courseEvent.listBySemester(activeSemesterId),
          ]);
          setCourses(courseList);
          setEvents(eventList);
        }

        setEditingCourse(null);
        setEditingEvent(null);
        setShowEditModal(false);
        if (view === 'edit') {
          setView('list');
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : '保存失败');
      }
    },
    [editingCourse, editingEvent, activeSemesterId, view]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingCourse(null);
    setEditingEvent(null);
    if (showEditModal) {
      setShowEditModal(false);
    } else {
      setView('list');
    }
  }, [showEditModal]);

  const handleTimetableDoubleClick = useCallback(
    (event: CourseEvent, course: Course) => {
      setEditingCourse(course);
      setEditingEvent(event);
      setShowEditModal(true);
    },
    []
  );

  const handleCourseDoubleClick = useCallback(
    (course: Course) => {
      setEditingCourse(course);
      setEditingEvent(null);
      setShowEditModal(true);
    },
    []
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
      try {
        const created = await window.api.cellAnnotation.create(input);
        if (activeSemesterId) {
          const annotations = await window.api.cellAnnotation.listBySemester(activeSemesterId);
          setCellAnnotations(annotations);
        }
        setEditingCell(null);
        return created?.id ?? null;
      } catch (err) {
        alert(err instanceof Error ? err.message : '保存备注失败');
        return null;
      }
    },
    [activeSemesterId]
  );

  const handleUpdateAnnotation = useCallback(
    async (id: number, note: string, color: string) => {
      try {
        await window.api.cellAnnotation.update(id, { note, color });
        if (activeSemesterId) {
          const annotations = await window.api.cellAnnotation.listBySemester(activeSemesterId);
          setCellAnnotations(annotations);
        }
        setEditingCell(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : '更新备注失败');
      }
    },
    [activeSemesterId]
  );

  const handleDeleteAnnotation = useCallback(
    async (id: number) => {
      try {
        await window.api.cellAnnotation.delete(id);
        if (activeSemesterId) {
          const annotations = await window.api.cellAnnotation.listBySemester(activeSemesterId);
          setCellAnnotations(annotations);
        }
        setEditingCell(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : '删除备注失败');
      }
    },
    [activeSemesterId]
  );

  // Smart paste handler
  const handleSmartPasteConfirm = useCallback(
    async (result: ImportResult) => {
      setShowSmartPaste(false);
      setImportResult(result);
      setView('import');
    },
    []
  );

  // Custom reminder handler
  const handleSetReminder = useCallback(
    (event: CourseEvent, course: Course) => {
      setReminderDialogEvent(event);
      setReminderDialogCourse(course);
    },
    []
  );

  const activeSemester = semesters.find((s) => s.id === activeSemesterId);

  // 提醒调度
  const { toasts, dismissToast, addTestToast } = useReminderScheduler({
    semesters,
    activeSemesterId,
    courses,
    events,
    sectionTimes,
    cellAnnotations,
  });

  if (loading) {
    return (
      <div className="app-loading">
        <h1>NEAU Local Schedule</h1>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Hidden file inputs for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <header className="app-header">
        <h1 className="app-title" onClick={() => setView('home')}>
          NEAU Local Schedule
        </h1>
        <button
          className="btn btn-sm dark-mode-toggle"
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        {semesters.length > 0 && (
          <SemesterSwitcher
            semesters={semesters}
            activeId={activeSemesterId}
            onSelect={handleSelectSemester}
          />
        )}
        {view !== 'import' && (
          <div className="header-actions">
            <button
              className="btn btn-sm"
              onClick={() => setView('settings')}
              title="设置提醒"
            >
              ⚙️
            </button>
            <button className="btn btn-sm" onClick={handleImportClick}>
              导入 JSON
            </button>
            <button className="btn btn-sm" onClick={() => setShowSmartPaste(true)} title="粘贴文本自动识别考试时间等信息">
              智能粘贴
            </button>
          </div>
        )}
        {view !== 'home' && view !== 'import' && activeSemesterId && (
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
            onBack={() => setView(activeSemesterId ? 'timetable' : 'home')}
            onTestToast={addTestToast}
          />
        ) : view === 'import' && importResult ? (
          <ImportPreview
            result={importResult}
            onConfirm={handleImportConfirm}
            onCancel={handleImportCancel}
          />
        ) : view === 'home' || !activeSemesterId ? (
          <SemesterManager
            semesters={semesters}
            onCreated={handleSemesterCreated}
            onDeleted={handleSemesterDeleted}
            onSeedMockData={window.api.dev ? handleSeedMockData : undefined}
            onClearAllData={window.api.dev ? handleClearAllData : undefined}
            onExportBackup={handleExportBackup}
            onRestoreBackup={handleRestoreBackup}
          />
        ) : view === 'timetable' && activeSemester ? (
          <TimetableGrid
            semester={activeSemester}
            courses={courses}
            events={events}
            sectionTimes={sectionTimes}
            currentWeek={currentWeek}
            unscheduledCourses={unscheduledCourses}
            cellAnnotations={cellAnnotations}
            eventIdsWithReminders={eventIdsWithReminders}
            onWeekChange={setCurrentWeek}
            onEventDoubleClick={handleTimetableDoubleClick}
            onCourseDoubleClick={handleCourseDoubleClick}
            onEmptyCellDoubleClick={handleEmptyCellDoubleClick}
            onDeleteAnnotation={handleDeleteAnnotation}
            onSetReminder={handleSetReminder}
          />
        ) : view === 'edit' && editingCourse ? (
          <CourseEditor
            course={editingCourse}
            event={editingEvent ?? undefined}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        ) : view === 'list' ? (
          <CourseListView
            courses={courses}
            events={events}
            onDeleteEvent={handleDeleteEvent}
            onDeleteCourse={handleDeleteCourse}
            onEditEvent={handleEditEvent}
            onEditCourse={handleEditCourse}
          />
        ) : null}
      </main>

      {/* Edit Modal for double-click on timetable */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCourse(null);
          setEditingEvent(null);
        }}
        title="编辑课程"
      >
        {editingCourse && (
          <CourseEditor
            course={editingCourse}
            event={editingEvent ?? undefined}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}
      </Modal>

      {/* Smart Paste Dialog */}
      {showSmartPaste && (
        <SmartPasteDialog
          onConfirm={handleSmartPasteConfirm}
          onCancel={() => setShowSmartPaste(false)}
        />
      )}

      {/* Cell Note Editor */}
      {editingCell && activeSemesterId && activeSemester && (
        <CellNoteEditor
          semesterId={activeSemesterId}
          weekday={editingCell.weekday}
          sectionNo={editingCell.sectionNo}
          currentWeek={currentWeek}
          existingAnnotation={
            cellAnnotations.find(
              (a) =>
                a.weekday === editingCell.weekday &&
                a.section_no === editingCell.sectionNo &&
                a.start_week <= currentWeek &&
                a.end_week >= currentWeek
            )
          }
          semester={activeSemester}
          sectionTimes={sectionTimes}
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
            currentWeek={currentWeek}
            sectionTimes={sectionTimes}
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
