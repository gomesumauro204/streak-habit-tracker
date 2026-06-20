interface StreakBadgeProps {
  streak: number;
  color: string;
}

export function StreakBadge({ streak, color }: StreakBadgeProps) {
  if (streak === 0) return null;

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5
                 text-xs font-semibold tabular-nums"
      style={{
        backgroundColor: `${color}18`,
        color: color,
      }}
    >
      <span aria-hidden>🔥</span>
      {streak}日連続
    </div>
  );
}
