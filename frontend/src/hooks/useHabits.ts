import { useCallback, useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import type { Habit, HabitInput } from '../types';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHabits = useCallback(() => {
    try {
      setError(null);
      setHabits(storage.getHabits());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const createHabit = (input: HabitInput) => {
    const habit = storage.createHabit(input);
    setHabits((prev) => [...prev, habit]);
    return habit;
  };

  const updateHabit = (id: number, input: HabitInput) => {
    const habit = storage.updateHabit(id, input);
    setHabits((prev) => prev.map((h) => (h.id === id ? habit : h)));
    return habit;
  };

  const deleteHabit = (id: number) => {
    storage.deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const toggleHabit = (id: number) => {
    const habit = storage.toggleHabit(id);
    setHabits((prev) => prev.map((h) => (h.id === id ? habit : h)));
    return habit;
  };

  return {
    habits,
    loading,
    error,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleHabit,
    refetch: fetchHabits,
  };
}
