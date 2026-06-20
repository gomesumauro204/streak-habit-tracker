import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Habit, HabitInput } from '../types';

/** 習慣データの取得・更新を管理するフック */
export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHabits = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getHabits();
      setHabits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const createHabit = async (input: HabitInput) => {
    const habit = await api.createHabit(input);
    setHabits((prev) => [...prev, habit]);
    return habit;
  };

  const updateHabit = async (id: number, input: HabitInput) => {
    const habit = await api.updateHabit(id, input);
    setHabits((prev) => prev.map((h) => (h.id === id ? habit : h)));
    return habit;
  };

  const deleteHabit = async (id: number) => {
    await api.deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const toggleHabit = async (id: number) => {
    const habit = await api.toggleHabit(id);
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
