import type { Habit, HabitInput, HeatmapDay } from '../types';
import { calculateStreak, generateDateRange, getToday } from './streak';

const HABITS_KEY = 'streak_habits';
const COMPLETIONS_KEY = 'streak_completions';

type StoredHabit = Omit<Habit, 'completed_today' | 'streak'>;
type StoredCompletions = Record<number, string[]>;

function loadHabits(): StoredHabit[] {
  try {
    return JSON.parse(localStorage.getItem(HABITS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveHabits(habits: StoredHabit[]) {
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

function loadCompletions(): StoredCompletions {
  try {
    return JSON.parse(localStorage.getItem(COMPLETIONS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveCompletions(completions: StoredCompletions) {
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
}

function nextId(habits: StoredHabit[]): number {
  return habits.length === 0 ? 1 : Math.max(...habits.map((h) => h.id)) + 1;
}

function now(): string {
  return new Date().toISOString();
}

function enrich(habit: StoredHabit): Habit {
  const completions = loadCompletions();
  const dates = new Set<string>(completions[habit.id] ?? []);
  const today = getToday();
  return {
    ...habit,
    completed_today: dates.has(today),
    streak: calculateStreak(dates, today),
  };
}

export const storage = {
  getHabits(): Habit[] {
    return loadHabits().map(enrich);
  },

  createHabit(input: HabitInput): Habit {
    const habits = loadHabits();
    const habit: StoredHabit = {
      id: nextId(habits),
      title: input.title,
      color: input.color,
      icon: input.icon,
      created_at: now(),
      updated_at: now(),
    };
    habits.push(habit);
    saveHabits(habits);
    return enrich(habit);
  },

  updateHabit(id: number, input: HabitInput): Habit {
    const habits = loadHabits();
    const idx = habits.findIndex((h) => h.id === id);
    if (idx === -1) throw new Error('Habit not found');
    habits[idx] = { ...habits[idx], ...input, updated_at: now() };
    saveHabits(habits);
    return enrich(habits[idx]);
  },

  deleteHabit(id: number): void {
    saveHabits(loadHabits().filter((h) => h.id !== id));
    const completions = loadCompletions();
    delete completions[id];
    saveCompletions(completions);
  },

  toggleHabit(id: number): Habit {
    const habits = loadHabits();
    const habit = habits.find((h) => h.id === id);
    if (!habit) throw new Error('Habit not found');

    const completions = loadCompletions();
    const dates = completions[id] ?? [];
    const today = getToday();
    completions[id] = dates.includes(today)
      ? dates.filter((d) => d !== today)
      : [...dates, today];
    saveCompletions(completions);
    return enrich(habit);
  },

  getHeatmap(id: number): HeatmapDay[] {
    const completions = loadCompletions();
    const dates = new Set<string>(completions[id] ?? []);
    return generateDateRange(365).map((date) => ({
      date,
      completed: dates.has(date),
    }));
  },
};
