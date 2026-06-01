export interface Course {
  id: number;
  semester_id: number;
  name: string;
  teacher: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CourseCreateInput {
  semester_id: number;
  name: string;
  teacher?: string;
  color?: string;
}

export interface CourseUpdateInput {
  name?: string;
  teacher?: string;
  color?: string;
}

/** Predefined course colors */
export const COURSE_COLORS = [
  '#4A90D9', // blue
  '#E06B75', // red
  '#50C878', // green
  '#E8A838', // orange
  '#9B59B6', // purple
  '#1ABC9C', // teal
  '#E67E22', // dark orange
  '#3498DB', // light blue
  '#E74C3C', // bright red
  '#2ECC71', // emerald
  '#F39C12', // yellow
  '#8E44AD', // dark purple
] as const;
