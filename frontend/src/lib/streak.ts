/** 日付を offset 日分シフトする（YYYY-MM-DD） */
export function shiftDate(dateStr: string, offsetDays: number): string {
  const date = new Date(dateStr + 'T12:00:00');
  date.setDate(date.getDate() + offsetDays);
  return formatDate(date);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getToday(): string {
  return formatDate(new Date());
}

/** 過去 N 日分の日付リストを生成（古い順） */
export function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(shiftDate(getToday(), -i));
  }
  return dates;
}

/**
 * 連続達成日数を計算する
 * - 今日達成済み → 今日から遡ってカウント
 * - 今日未達成・昨日達成済み → 昨日から遡ってカウント
 */
export function calculateStreak(completedDates: Set<string>, today: string): number {
  if (completedDates.size === 0) return 0;
  const yesterday = shiftDate(today, -1);

  let startDate: string | null = null;
  if (completedDates.has(today)) startDate = today;
  else if (completedDates.has(yesterday)) startDate = yesterday;
  else return 0;

  let streak = 0;
  let cursor = startDate;
  while (completedDates.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}
