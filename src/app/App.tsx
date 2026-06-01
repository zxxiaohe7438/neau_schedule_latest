import { useState, useEffect, useCallback } from 'react';
import type { Semester } from '../domain/Semester';
import type { Course } from '../domain/Course';
import type { CourseEvent } from '../domain/CourseEvent';
import type { SectionTime } from '../domain/SectionTime';
import { SemesterManager } from '../components/SemesterManager';
import { SemesterSwitcher } from '../components/SemesterSwitcher';
import { TimetableGrid } from '../components/TimetableGrid';
import { CourseListView } from '../components/CourseListView';
import { getWeekNumber } from '../utils/dateUtils';

type View = 'home' | 'timetable' | 'list';

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
        {view !== 'home' && activeSemesterId && (
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
        {view === 'home' || !activeSemesterId ? (
          <SemesterManager
            semesters={semesters}
            onCreated={handleSemesterCreated}
            onDeleted={handleSemesterDeleted}
            onSeedMockData={window.api.dev ? handleSeedMockData : undefined}
          />
        ) : view === 'timetable' && activeSemester ? (
          <TimetableGrid
            semester={activeSemester}
            courses={courses}
            events={events}
            sectionTimes={sectionTimes}
            currentWeek={currentWeek}
            onWeekChange={setCurrentWeek}
          />
        ) : view === 'list' ? (
          <CourseListView
            courses={courses}
            events={events}
            onDeleteEvent={handleDeleteEvent}
            onDeleteCourse={handleDeleteCourse}
          />
        ) : null}
      </main>
    </div>
  );
}
