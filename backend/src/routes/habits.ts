import { Router } from 'express';
import { db } from '../db/index.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import {
  calculateStreak,
  generateDateRange,
  getToday,
} from '../services/streak.js';
import type { Habit, HabitInput, HabitWithStats, HeatmapDay } from '../types.js';

const router = Router();

const ALLOWED_COLORS = [
  '#14b8a6', '#0ea5e9', '#8b5cf6', '#f43f5e',
  '#f59e0b', '#10b981', '#6366f1', '#ec4899',
];

const ALLOWED_ICONS = ['✨', '🏃', '📚', '💧', '🧘', '💪', '🎯', '🌱', '☀️', '📝'];

/** リクエストボディのバリデーション */
function validateHabitInput(body: unknown): HabitInput {
  if (!body || typeof body !== 'object') {
    throw new AppError(400, 'Invalid request body');
  }

  const { title, color, icon } = body as Record<string, unknown>;

  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new AppError(400, 'Title is required');
  }
  if (title.trim().length > 100) {
    throw new AppError(400, 'Title must be 100 characters or less');
  }

  const resolvedColor =
    typeof color === 'string' && ALLOWED_COLORS.includes(color)
      ? color
      : ALLOWED_COLORS[0];

  const resolvedIcon =
    typeof icon === 'string' && ALLOWED_ICONS.includes(icon)
      ? icon
      : ALLOWED_ICONS[0];

  return { title: title.trim(), color: resolvedColor, icon: resolvedIcon };
}

/** 習慣にストリーク・今日の達成状況を付与 */
function enrichHabit(habit: Habit): HabitWithStats {
  const today = getToday();
  const completions = db
    .prepare(
      'SELECT date, completed FROM completions WHERE habit_id = ? ORDER BY date DESC'
    )
    .all(habit.id) as { date: string; completed: number }[];

  const mapped = completions.map((c) => ({
    date: c.date,
    completed: c.completed === 1,
  }));

  const completedToday = mapped.some((c) => c.date === today && c.completed);

  return {
    ...habit,
    completed_today: completedToday,
    streak: calculateStreak(mapped, today),
  };
}

// GET /api/habits — 全習慣一覧（ストリーク付き）
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const habits = db
      .prepare('SELECT * FROM habits ORDER BY created_at ASC')
      .all() as Habit[];

    res.json(habits.map(enrichHabit));
  })
);

// GET /api/habits/:id — 単一習慣
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const habit = db
      .prepare('SELECT * FROM habits WHERE id = ?')
      .get(req.params.id) as Habit | undefined;

    if (!habit) throw new AppError(404, 'Habit not found');
    res.json(enrichHabit(habit));
  })
);

// POST /api/habits — 習慣作成
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = validateHabitInput(req.body);
    const result = db
      .prepare(
        'INSERT INTO habits (title, color, icon) VALUES (?, ?, ?)'
      )
      .run(input.title, input.color, input.icon);

    const habit = db
      .prepare('SELECT * FROM habits WHERE id = ?')
      .get(result.lastInsertRowid) as Habit;

    res.status(201).json(enrichHabit(habit));
  })
);

// PUT /api/habits/:id — 習慣更新
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = db
      .prepare('SELECT * FROM habits WHERE id = ?')
      .get(req.params.id) as Habit | undefined;

    if (!existing) throw new AppError(404, 'Habit not found');

    const input = validateHabitInput(req.body);
    db.prepare(
      `UPDATE habits SET title = ?, color = ?, icon = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(input.title, input.color, input.icon, req.params.id);

    const habit = db
      .prepare('SELECT * FROM habits WHERE id = ?')
      .get(req.params.id) as Habit;

    res.json(enrichHabit(habit));
  })
);

// DELETE /api/habits/:id — 習慣削除
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = db
      .prepare('DELETE FROM habits WHERE id = ?')
      .run(req.params.id);

    if (result.changes === 0) throw new AppError(404, 'Habit not found');
    res.status(204).send();
  })
);

// PUT /api/habits/:id/toggle — 今日の達成状態をトグル
router.put(
  '/:id/toggle',
  asyncHandler(async (req, res) => {
    const habit = db
      .prepare('SELECT * FROM habits WHERE id = ?')
      .get(req.params.id) as Habit | undefined;

    if (!habit) throw new AppError(404, 'Habit not found');

    const today = getToday();
    const existing = db
      .prepare(
        'SELECT * FROM completions WHERE habit_id = ? AND date = ?'
      )
      .get(habit.id, today) as { completed: number } | undefined;

    if (existing) {
      // 達成済み → 未達成に切り替え（レコード削除）
      db.prepare(
        'DELETE FROM completions WHERE habit_id = ? AND date = ?'
      ).run(habit.id, today);
    } else {
      // 未達成 → 達成に記録
      db.prepare(
        'INSERT INTO completions (habit_id, date, completed) VALUES (?, ?, 1)'
      ).run(habit.id, today);
    }

    res.json(enrichHabit(habit));
  })
);

// GET /api/habits/:id/heatmap — 過去365日の達成ヒートマップデータ
router.get(
  '/:id/heatmap',
  asyncHandler(async (req, res) => {
    const habit = db
      .prepare('SELECT * FROM habits WHERE id = ?')
      .get(req.params.id) as Habit | undefined;

    if (!habit) throw new AppError(404, 'Habit not found');

    const days = Number(req.query.days) || 365;
    const dateRange = generateDateRange(Math.min(days, 365));

    const completions = db
      .prepare(
        `SELECT date FROM completions
         WHERE habit_id = ? AND completed = 1 AND date >= ?`
      )
      .all(habit.id, dateRange[0]) as { date: string }[];

    const completedSet = new Set(completions.map((c) => c.date));

    const heatmap: HeatmapDay[] = dateRange.map((date) => ({
      date,
      completed: completedSet.has(date),
    }));

    res.json({ habit_id: habit.id, days: heatmap });
  })
);

export default router;
