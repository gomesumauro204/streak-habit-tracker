import { useState } from 'react';
import { Header } from './components/Header';
import { HabitCard } from './components/HabitCard';
import { HabitModal } from './components/HabitModal';
import { EmptyState } from './components/EmptyState';
import { useHabits } from './hooks/useHabits';
import { useTheme } from './hooks/useTheme';
import type { Habit, HabitInput } from './types';

export default function App() {
  const { habits, loading, error, createHabit, updateHabit, deleteHabit, toggleHabit, refetch } =
    useHabits();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const completedCount = habits.filter((h) => h.completed_today).length;

  const openCreate = () => {
    setEditingHabit(null);
    setModalOpen(true);
  };

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };

  const handleSave = async (input: HabitInput) => {
    if (editingHabit) {
      await updateHabit(editingHabit.id, input);
    } else {
      await createHabit(input);
    }
  };

  return (
    <div className="min-h-screen">
      {/* 背景のグラデーション装飾 */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
        aria-hidden
      >
        <div
          className="absolute -top-40 -right-40 h-80 w-80 rounded-full
                     bg-brand-500/5 blur-3xl dark:bg-brand-500/10"
        />
        <div
          className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full
                     bg-brand-500/5 blur-3xl dark:bg-brand-500/10"
        />
      </div>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
        <Header
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onAddClick={openCreate}
          completedCount={completedCount}
          totalCount={habits.length}
        />

        {/* エラー表示 */}
        {error && (
          <div
            className="mb-6 flex items-center justify-between rounded-xl
                       border border-red-500/20 bg-red-500/5 px-4 py-3"
            role="alert"
          >
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={refetch}
              className="text-sm font-medium text-red-600 dark:text-red-400
                         hover:underline shrink-0 ml-4"
            >
              再試行
            </button>
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          </div>
        )}

        {/* 習慣一覧 */}
        {!loading && habits.length === 0 && !error && (
          <EmptyState onAddClick={openCreate} />
        )}

        {!loading && habits.length > 0 && (
          <div className="space-y-3">
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={toggleHabit}
                onEdit={openEdit}
                onDelete={deleteHabit}
              />
            ))}
          </div>
        )}
      </main>

      <HabitModal
        habit={editingHabit}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* アニメーション定義 */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes checkIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
