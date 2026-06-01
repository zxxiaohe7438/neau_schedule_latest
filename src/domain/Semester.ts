export interface Semester {
  id: number;
  name: string;
  start_date: string; // YYYY-MM-DD
  weeks_count: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface SemesterCreateInput {
  name: string;
  start_date: string;
  weeks_count: number;
}

export interface SemesterUpdateInput {
  name?: string;
  start_date?: string;
  weeks_count?: number;
  is_archived?: boolean;
}
