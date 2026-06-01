import type { Semester } from '../domain/Semester';

interface SemesterSwitcherProps {
  semesters: Semester[];
  activeId: number | null;
  onSelect: (id: number) => void;
}

export function SemesterSwitcher({
  semesters,
  activeId,
  onSelect,
}: SemesterSwitcherProps) {
  const active = semesters.find((s) => s.id === activeId);
  const nonArchived = semesters.filter((s) => !s.is_archived);

  if (nonArchived.length === 0) {
    return null;
  }

  return (
    <div className="semester-switcher">
      <select
        value={activeId ?? ''}
        onChange={(e) => {
          const val = Number(e.target.value);
          if (val) onSelect(val);
        }}
      >
        {nonArchived.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {active && (
        <span className="semester-info">
          {active.start_date} · {active.weeks_count} 周
        </span>
      )}
    </div>
  );
}
