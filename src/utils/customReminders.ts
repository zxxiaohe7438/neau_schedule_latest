const STORAGE_KEY = 'customReminders';

export type ReminderSourceType = 'event' | 'annotation';

export interface CustomReminder {
  source_type: ReminderSourceType;
  source_id: number;      // event_id 或 annotation_id
  remind_at: string;      // ISO 8601 日期时间字符串
  label?: string;         // 可选备注
}

/** 读取所有自定义提醒（兼容旧格式） */
export function getCustomReminders(): CustomReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown[];
      return (parsed as Array<Record<string, unknown>>).map(migrateLegacy);
    }
  } catch {
    // ignore
  }
  return [];
}

/** 迁移旧格式 { event_id, remind_at } → { source_type, source_id, remind_at } */
function migrateLegacy(item: Record<string, unknown>): CustomReminder {
  if ('source_type' in item && 'source_id' in item) {
    return item as unknown as CustomReminder;
  }
  // 旧格式
  return {
    source_type: 'event',
    source_id: (item.event_id as number) ?? 0,
    remind_at: (item.remind_at as string) ?? '',
    label: item.label as string | undefined,
  };
}

/** 保存整个自定义提醒列表 */
export function saveCustomReminders(reminders: CustomReminder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

/** 添加一个自定义提醒 */
export function addCustomReminder(reminder: CustomReminder): void {
  const all = getCustomReminders();
  const exists = all.some(
    r =>
      r.source_type === reminder.source_type &&
      r.source_id === reminder.source_id &&
      r.remind_at === reminder.remind_at
  );
  if (!exists) {
    all.push(reminder);
    saveCustomReminders(all);
  }
}

/** 删除一个自定义提醒 */
export function removeCustomReminder(
  sourceType: ReminderSourceType,
  sourceId: number,
  remindAt: string
): void {
  const all = getCustomReminders();
  const filtered = all.filter(
    r =>
      !(
        r.source_type === sourceType &&
        r.source_id === sourceId &&
        r.remind_at === remindAt
      )
  );
  saveCustomReminders(filtered);
}

/** 获取某个来源的自定义提醒列表 */
export function getCustomRemindersForSource(
  sourceType: ReminderSourceType,
  sourceId: number
): CustomReminder[] {
  return getCustomReminders().filter(
    r => r.source_type === sourceType && r.source_id === sourceId
  );
}
