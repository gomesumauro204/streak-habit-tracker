export interface Habit {
  id: number;
  title: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
  completed_today: boolean;
  streak: number;
}

export interface HabitInput {
  title: string;
  color: string;
  icon: string;
}

export interface HeatmapDay {
  date: string;
  completed: boolean;
}

export interface HeatmapResponse {
  habit_id: number;
  days: HeatmapDay[];
}

export const HABIT_COLORS = [
  '#14b8a6', '#0ea5e9', '#8b5cf6', '#f43f5e',
  '#f59e0b', '#10b981', '#6366f1', '#ec4899',
] as const;

export const HABIT_ICONS = [
  '✨', '🏃', '📚', '💧', '🧘', '💪', '🎯', '🌱', '☀️', '📝',
] as const;
