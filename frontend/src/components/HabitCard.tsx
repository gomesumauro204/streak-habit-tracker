import { useState } from 'react';
import type { Habit } from '../types';
import { StreakBadge } from './StreakBadge';
import { Heatmap } from './Heatmap';

interface HabitCardProps {
  habit: Habit;
  onToggle: (id: number) => Promise<unknown>;
  onEdit: (habit: Habit) => void;
  onDelete: (id: number) => Promise<void>;
}

export function HabitCard({ habit, onToggle, onEdit, onDelete }: HabitCardProps) {
  const [toggling, setToggling] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      await onToggle(habit.id);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDelete(habit.id);
  };

  return (
    <article
      className={`group rounded-2xl border bg-surface-raised transition-all duration-300
                  ${habit.completed_today
                    ? 'border-brand-500/30 shadow-sm shadow-brand-500/5'
                    : 'border-border hover:border-border/80'
                  }`}
    >
      <div className="flex items-center gap-4 p-4 sm:p-5">
        {/* チェックボックス */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-label={habit.completed_today ? '達成を取り消す' : '達成にする'}
          className={`relative flex h-7 w-7 shrink-0 items-center justify-center
                      rounded-lg border-2 transition-all duration-200
                      ${habit.completed_today
                        ? 'border-transparent scale-100'
                        : 'border-border hover:border-brand-400 bg-transparent'
                      }
                      ${toggling ? 'opacity-50' : 'hover:scale-110 active:scale-95'}`}
          style={{
            backgroundColor: habit.completed_today ? habit.color : undefined,
          }}
        >
          {habit.completed_today && (
            <svg
              className="h-4 w-4 text-white animate-[checkIn_0.2s_ease-out]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* アイコン */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: `${habit.color}15` }}
        >
          {habit.icon}
        </div>

        {/* タイトル & ストリーク */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-semibold truncate transition-all duration-200
                        ${habit.completed_today ? 'text-muted line-through' : ''}`}
          >
            {habit.title}
          </h3>
          <div className="mt-1">
            <StreakBadge streak={habit.streak} color={habit.color} />
          </div>
        </div>

        {/* アクション */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100
                        focus-within:opacity-100 transition-opacity duration-200
                        max-sm:opacity-100">
          <button
            onClick={() => onEdit(habit)}
            aria-label="編集"
            className="flex h-8 w-8 items-center justify-center rounded-lg
                       text-muted hover:text-foreground hover:bg-surface-overlay
                       transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            aria-label="削除"
            className={`flex h-8 items-center justify-center rounded-lg
                        transition-colors text-xs px-2
                        ${confirmDelete
                          ? 'bg-red-500/10 text-red-500 font-medium'
                          : 'w-8 text-muted hover:text-red-500 hover:bg-red-500/10'
                        }`}
            onBlur={() => setTimeout(() => setConfirmDelete(false), 150)}
          >
            {confirmDelete ? '確認' : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>

        {/* 展開トグル */}
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'ヒートマップを閉じる' : 'ヒートマップを表示'}
          aria-expanded={expanded}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                     text-muted hover:text-foreground hover:bg-surface-overlay
                     transition-all duration-200"
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* ヒートマップ（展開時） */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out
                    ${expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 sm:px-5 pb-5 pt-0 border-t border-border/50">
          <div className="pt-4">
            <Heatmap habitId={habit.id} color={habit.color} />
          </div>
        </div>
      </div>
    </article>
  );
}
