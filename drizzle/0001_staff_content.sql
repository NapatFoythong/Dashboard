CREATE TABLE IF NOT EXISTS staff_publications (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  detail TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  index_name TEXT NOT NULL DEFAULT '',
  psu TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS staff_publications_year_month_idx
  ON staff_publications (year, month);

CREATE TABLE IF NOT EXISTS hidden_publications (
  id TEXT PRIMARY KEY NOT NULL,
  deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_programmes (
  faculty_name TEXT PRIMARY KEY NOT NULL,
  programmes_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
