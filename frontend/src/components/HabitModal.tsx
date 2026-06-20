import { useEffect, useRef, useState } from 'react';
import type { Habit, HabitInput } from '../types';
import { HABIT_COLORS, HABIT_ICONS } from '../types';

interface HabitModalProps {
  habit?: Habit | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: HabitInput) => Promise<void>;
}

export function HabitModal({ habit, isOpen, onClose, onSave }: HabitModalProps) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);
  const [icon, setIcon] = useState<string>(HABIT_ICONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!habit;

  useEffect(() => {
    if (isOpen) {
      setTitle(habit?.title ?? '');
      setColor(habit?.color ?? HABIT_COLORS[0]);
      setIcon(habit?.icon ?? HABIT_ICONS[0]);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, habit]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), color, icon });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl
                   bg-surface-raised border border-border shadow-2xl
                   animate-[slideUp_0.3s_ease-out]"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 id="modal-title" className="text-lg font-bold mb-6">
              {isEditing ? '習慣を編集' : '新しい習慣'}
            </h2>

            {/* タイトル */}
            <div className="mb-5">
              <label htmlFor="habit-title" className="block text-sm font-medium text-muted mb-2">
                タイトル
              </label>
              <input
                ref={inputRef}
                id="habit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 朝のランニング"
                maxLength={100}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3
                           text-sm outline-none transition-colors
                           focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* アイコン選択 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-muted mb-2">アイコン</label>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg
                                transition-all duration-150
                                ${icon === ic
                                  ? 'ring-2 ring-brand-500 bg-brand-500/10 scale-110'
                                  : 'bg-surface-overlay hover:scale-105'
                                }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* カラー選択 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-muted mb-2">カラー</label>
              <div className="flex flex-wrap gap-2">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`カラー ${c}`}
                    className={`h-8 w-8 rounded-full transition-all duration-150
                                ${color === c ? 'scale-110' : 'hover:scale-105'}`}
                    style={{
                      backgroundColor: c,
                      boxShadow:
                        color === c
                          ? `0 0 0 2px var(--color-surface-raised), 0 0 0 4px ${c}`
                          : undefined,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* プレビュー */}
            <div className="flex items-center gap-3 rounded-xl bg-surface-overlay p-3 mb-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-base"
                style={{ backgroundColor: `${color}15` }}
              >
                {icon}
              </div>
              <span className="text-sm font-medium truncate">
                {title || 'プレビュー'}
              </span>
            </div>

            {error && (
              <p className="text-sm text-red-500 mt-3" role="alert">{error}</p>
            )}
          </div>

          {/* フッター */}
          <div className="flex gap-3 border-t border-border p-4 sm:p-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-medium
                         text-muted hover:text-foreground hover:bg-surface-overlay
                         transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white
                         transition-all hover:bg-brand-600 disabled:opacity-50
                         shadow-sm shadow-brand-500/25"
            >
              {saving ? '保存中...' : isEditing ? '更新する' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
