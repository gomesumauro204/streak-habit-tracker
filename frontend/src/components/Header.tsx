import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onAddClick: () => void;
  completedCount: number;
  totalCount: number;
}

export function Header({
  isDark,
  onToggleTheme,
  onAddClick,
  completedCount,
  totalCount,
}: HeaderProps) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <header className="mb-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted mb-1">{dateStr}</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Streak
          </h1>
          <p className="mt-2 text-muted text-sm sm:text-base">
            今日の習慣を記録しましょう
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          <button
            onClick={onAddClick}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-500 px-4
                       text-sm font-semibold text-white transition-all duration-200
                       hover:bg-brand-600 hover:scale-105 active:scale-95
                       shadow-sm shadow-brand-500/25"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">習慣を追加</span>
          </button>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted">今日の進捗</span>
            <span className="font-semibold tabular-nums">
              {completedCount}
              <span className="text-muted font-normal"> / {totalCount}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-overlay overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
