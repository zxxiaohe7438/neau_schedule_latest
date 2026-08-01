-- NEAU Local Schedule - SQLite Schema

CREATE TABLE IF NOT EXISTS semesters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,          -- YYYY-MM-DD
  weeks_count INTEGER NOT NULL DEFAULT 18,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS section_times (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL,
  section_no INTEGER NOT NULL,
  start_time TEXT NOT NULL,          -- HH:MM
  end_time TEXT NOT NULL,            -- HH:MM
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  UNIQUE(semester_id, section_no)
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL,
  course_number TEXT NOT NULL DEFAULT '',  -- 课程号
  name TEXT NOT NULL,
  teacher TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#4A90D9',
  units REAL NOT NULL DEFAULT 0,  -- 学分
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  weekday INTEGER NOT NULL CHECK(weekday >= 1 AND weekday <= 7),
  start_section INTEGER NOT NULL,
  end_section INTEGER NOT NULL,
  start_week INTEGER NOT NULL,
  end_week INTEGER NOT NULL,
  week_pattern TEXT NOT NULL DEFAULT 'all' CHECK(week_pattern IN ('all', 'odd', 'even')),
  location TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  source_hash TEXT NOT NULL DEFAULT '',
  updated_manually INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CHECK(start_section <= end_section),
  CHECK(start_week <= end_week)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_section_times_semester ON section_times(semester_id);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester_id);
CREATE INDEX IF NOT EXISTS idx_course_events_course ON course_events(course_id);
CREATE INDEX IF NOT EXISTS idx_course_events_weekday ON course_events(weekday);
CREATE INDEX IF NOT EXISTS idx_course_events_source_hash ON course_events(source_hash);

-- Cell annotations for custom notes/colors on empty timetable cells
CREATE TABLE IF NOT EXISTS cell_annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  semester_id INTEGER NOT NULL,
  weekday INTEGER NOT NULL CHECK(weekday >= 1 AND weekday <= 7),
  section_no INTEGER NOT NULL,
  start_week INTEGER NOT NULL,
  end_week INTEGER NOT NULL,
  week_pattern TEXT NOT NULL DEFAULT 'all' CHECK(week_pattern IN ('all', 'odd', 'even')),
  note TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#FFE082',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
  UNIQUE(semester_id, weekday, section_no, start_week, end_week, week_pattern)
);

CREATE INDEX IF NOT EXISTS idx_cell_annotations_semester ON cell_annotations(semester_id);
