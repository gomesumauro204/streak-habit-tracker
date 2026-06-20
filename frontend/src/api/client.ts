import type { Habit, HabitInput, HeatmapResponse } from '../types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getHabits: () => request<Habit[]>('/habits'),

  createHabit: (data: HabitInput) =>
    request<Habit>('/habits', { method: 'POST', body: JSON.stringify(data) }),

  updateHabit: (id: number, data: HabitInput) =>
    request<Habit>(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteHabit: (id: number) =>
    request<void>(`/habits/${id}`, { method: 'DELETE' }),

  toggleHabit: (id: number) =>
    request<Habit>(`/habits/${id}/toggle`, { method: 'PUT' }),

  getHeatmap: (id: number) =>
    request<HeatmapResponse>(`/habits/${id}/heatmap`),
};
