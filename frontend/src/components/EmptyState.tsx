interface EmptyStateProps {
  onAddClick: () => void;
}

export function EmptyState({ onAddClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl
                   bg-brand-500/10 text-4xl"
      >
        🌱
      </div>
      <h2 className="text-xl font-bold mb-2">習慣を始めましょう</h2>
      <p className="text-muted text-sm max-w-sm mb-8 leading-relaxed">
        毎日の小さな積み重ねが、大きな変化を生みます。
        最初の習慣を追加して、今日から記録を始めましょう。
      </p>
      <button
        onClick={onAddClick}
        className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3
                   text-sm font-semibold text-white transition-all duration-200
                   hover:bg-brand-600 hover:scale-105 active:scale-95
                   shadow-sm shadow-brand-500/25"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        最初の習慣を追加
      </button>
    </div>
  );
}
