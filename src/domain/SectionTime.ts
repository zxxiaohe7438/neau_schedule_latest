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

/** NEAU default section time schedule */
export const DEFAULT_SECTION_TIMES: SectionTimeCreateInput[] = [
  { section_no: 1,  start_time: '08:00', end_time: '08:45' },
  { section_no: 2,  start_time: '08:55', end_time: '09:40' },
  { section_no: 3,  start_time: '10:00', end_time: '10:45' },
  { section_no: 4,  start_time: '10:55', end_time: '11:40' },
  { section_no: 5,  start_time: '14:00', end_time: '14:45' },
  { section_no: 6,  start_time: '14:55', end_time: '15:40' },
  { section_no: 7,  start_time: '16:00', end_time: '16:45' },
  { section_no: 8,  start_time: '16:55', end_time: '17:40' },
  { section_no: 9,  start_time: '19:00', end_time: '19:45' },
  { section_no: 10, start_time: '19:55', end_time: '20:40' },
  { section_no: 11, start_time: '20:50', end_time: '21:35' },
];
