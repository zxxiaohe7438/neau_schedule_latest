export interface Course {
  id: number;
  semester_id: number;
  course_number: string;  // 课程号
  name: string;
  teacher: string;
  color: string;
  units: number;  // 学分
  created_at: string;
  updated_at: string;
}

export interface CourseCreateInput {
  semester_id: number;
  course_number?: string;
  name: string;
  teacher?: string;
  color?: string;
  units?: number;
}

export interface CourseUpdateInput {
  course_number?: string;
  name?: string;
  teacher?: string;
  color?: string;
  units?: number;
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
