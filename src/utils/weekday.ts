/**
 * Weekday utilities shared by importers.
 */

/**
 * Weekday name to number mapping (1=周一 ... 7=周日).
 * Covers Chinese short/long forms, English short/long forms and single characters.
 */
export const WEEKDAY_MAP: Record<string, number> = {
  '周一': 1, '星期一': 1, 'Monday': 1, 'Mon': 1, '一': 1,
  '周二': 2, '星期二': 2, 'Tuesday': 2, 'Tue': 2, '二': 2,
  '周三': 3, '星期三': 3, 'Wednesday': 3, 'Wed': 3, '三': 3,
  '周四': 4, '星期四': 4, 'Thursday': 4, 'Thu': 4, '四': 4,
  '周五': 5, '星期五': 5, 'Friday': 5, 'Fri': 5, '五': 5,
  '周六': 6, '星期六': 6, 'Saturday': 6, 'Sat': 6, '六': 6,
  '周日': 7, '星期日': 7, 'Sunday': 7, 'Sun': 7, '日': 7,
};
