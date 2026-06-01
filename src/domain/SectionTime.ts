export interface SectionTime {
  id: number;
  semester_id: number;
  section_no: number;
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
}

export interface SectionTimeCreateInput {
  section_no: number;
  start_time: string;
  end_time: string;
}

/** NEAU default section time schedule (2025-2026) */
export const DEFAULT_SECTION_TIMES: SectionTimeCreateInput[] = [
  // 第一大节
  { section_no: 1, start_time: '08:10', end_time: '08:55' },
  { section_no: 2, start_time: '09:00', end_time: '09:45' },
  // 第二大节（教学楼、研究生楼）
  { section_no: 3, start_time: '10:05', end_time: '10:50' },
  { section_no: 4, start_time: '10:55', end_time: '11:40' },
  // 第三大节
  { section_no: 5, start_time: '13:30', end_time: '14:15' },
  { section_no: 6, start_time: '14:20', end_time: '15:05' },
  // 第四大节
  { section_no: 7, start_time: '15:35', end_time: '16:20' },
  { section_no: 8, start_time: '16:25', end_time: '17:10' },
  // 第五大节
  { section_no: 9, start_time: '18:30', end_time: '19:15' },
  { section_no: 10, start_time: '19:20', end_time: '20:05' },
  // 第六大节
  { section_no: 11, start_time: '20:15', end_time: '21:00' },
  { section_no: 12, start_time: '21:05', end_time: '21:50' },
];
