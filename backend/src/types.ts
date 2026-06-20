/** 習慣エンティティ */
export interface Habit {
  id: number;
  title: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

/** APIレスポンス用：習慣 + 今日の達成状況 + ストリーク */
export interface HabitWithStats extends Habit {
  completed_today: boolean;
  streak: number;
}

/** 達成記録 */
export interface Completion {
  id: number;
  habit_id: number;
  date: string;
  completed: boolean;
}

/** 習慣作成・更新リクエスト */
export interface HabitInput {
  title: string;
  color: string;
  icon: string;
}

/** ヒートマップ用の日別達成データ */
export interface HeatmapDay {
  date: string;
  completed: boolean;
}
