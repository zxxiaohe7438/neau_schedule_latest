import { useState, useEffect, useCallback, useRef } from 'react';
import type { Semester } from '../domain/Semester';
import type { Course } from '../domain/Course';
import type { CourseEvent } from '../domain/CourseEvent';
import type { SectionTime } from '../domain/SectionTime';
import type { ImportResult } from '../domain/ImportResult';
import { SemesterManager } from '../components/SemesterManager';
import { SemesterSwitcher } from '../components/SemesterSwitcher';
import { TimetableGrid } from '../components/TimetableGrid';
import { CourseListView } from '../components/CourseListView';
import { CourseEditor } from '../components/CourseEditor';
import { ImportPreview } from '../components/ImportPreview';
import { LoginPanel } from '../components/LoginPanel';
import { Modal } from '../components/Modal';
import { getWeekNumber } from '../utils/dateUtils';

type View = 'home' | 'timetable' | 'list' | 'import' | 'edit' | 'login';

export function App() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('home');

  // Data for active semester
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<CourseEvent[]>([]);
  const [sectionTimes, setSectionTimes] = useState<SectionTime[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [unscheduledCourses, setUnscheduledCourses] = useState<Course[]>([]);

  // Import state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const schoolIndexInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingEvent, setEditingEvent] = useState<CourseEvent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Login state — uses IPC auth instead of localStorage
  const [savedUsername, setSavedUsername] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (window.api.auth) {
          const status = await window.api.auth.status();
          setIsLoggedIn(status.loggedIn);
          if (status.username) {
            setSavedUsername(status.username);
          }
        }
      } catch {
        // Auth API not available — stay logged out
      }
    };
    checkAuth();
  }, []);

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
        const [courseList, eventList, timeList] = await Promise.all([
          window.api.course.listBySemester(activeSemesterId),
          window.api.courseEvent.listBySemester(activeSemesterId),
          window.api.sectionTime.listBySemester(activeSemesterId),
        ]);
        setCourses(courseList);
        setEvents(eventList);
        setSectionTimes(timeList);

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

  // Login handlers — now uses IPC auth
  const handleLogin = useCallback((username: string) => {
    setSavedUsername(username);
    setIsLoggedIn(true);
    setView('home');
    // Reload semesters after login (in case schedule was fetched)
    loadSemesters();
  }, [loadSemesters]);

  const handleLogout = useCallback(async () => {
    try {
      if (window.api.auth) {
        await window.api.auth.logout();
      }
    } catch {
      // Ignore
    }
    setIsLoggedIn(false);
    setSavedUsername('');
  }, []);

  // Import handlers
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSchoolIndexImport = useCallback(() => {
    schoolIndexInputRef.current?.click();
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

  const handleSchoolIndexFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        console.log('Importing school index...');
        const result = await window.api.import.importSchoolIndex(text);
        console.log('Import result:', result);
        if (result.courses.length === 0 && (!result.unscheduled_courses || result.unscheduled_courses.length === 0)) {
          alert('未能从文件中解析出课程数据。\n\n请确保文件是从 F12 Network 中复制的 ajaxStudentSchedule/callback 响应。');
          return;
        }
        setImportResult(result);
        setView('import');
      } catch (err) {
        console.error('Import error:', err);
        alert(err instanceof Error ? err.message : '导入失败');
      }

      // Reset file input
      if (schoolIndexInputRef.current) {
        schoolIndexInputRef.current.value = '';
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

  const activeSemester = semesters.find((s) => s.id === activeSemesterId);

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
      <input
        ref={schoolIndexInputRef}
        type="file"
        accept=".json,.txt"
        style={{ display: 'none' }}
        onChange={handleSchoolIndexFileChange}
      />

      <header className="app-header">
        <h1 className="app-title" onClick={() => setView('home')}>
          NEAU Local Schedule
        </h1>
        {semesters.length > 0 && (
          <SemesterSwitcher
            semesters={semesters}
            activeId={activeSemesterId}
            onSelect={handleSelectSemester}
          />
        )}
        {view !== 'import' && (
          <div className="header-actions">
            <button className="btn btn-sm" onClick={handleImportClick}>
              导入 JSON
            </button>
            <button className="btn btn-sm" onClick={handleSchoolIndexImport} title="导入从 F12 Network 复制的课表数据">
              导入课表数据
            </button>
            {isLoggedIn ? (
              <div className="user-info">
                <span className="user-name">{savedUsername}</span>
                <button className="btn btn-sm btn-secondary" onClick={handleLogout}>
                  退出
                </button>
              </div>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={() => setView('login')}>
                连接学校系统
              </button>
            )}
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
        {view === 'login' ? (
          <LoginPanel
            savedUsername={savedUsername}
            onLogin={handleLogin}
            onCancel={() => setView('home')}
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
          />
        ) : view === 'timetable' && activeSemester ? (
          <TimetableGrid
            semester={activeSemester}
            courses={courses}
            events={events}
            sectionTimes={sectionTimes}
            currentWeek={currentWeek}
            unscheduledCourses={unscheduledCourses}
            onWeekChange={setCurrentWeek}
            onEventDoubleClick={handleTimetableDoubleClick}
            onCourseDoubleClick={handleCourseDoubleClick}
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
    </div>
  );
}
