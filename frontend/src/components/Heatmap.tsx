import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { HeatmapDay } from '../types';

interface HeatmapProps {
  habitId: number;
  color: string;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** GitHub風の達成ヒートマップ */
export function Heatmap({ habitId, color }: HeatmapProps) {
  const [days, setDays] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getHeatmap(habitId)
      .then((data) => {
        if (!cancelled) setDays(data.days);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [habitId]);

  // 日付を週単位のグリッドに変換（GitHubスタイル: 列=週、行=曜日）
  const weeks = useMemo(() => {
    if (days.length === 0) return [];

    const firstDate = new Date(days[0].date + 'T12:00:00');
    const startPad = firstDate.getDay(); // 最初の週の空白セル数

    const cells: (HeatmapDay | null)[] = [
      ...Array(startPad).fill(null),
      ...days,
    ];

    const result: (HeatmapDay | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }

    // 最後の週を7日に揃える
    const lastWeek = result[result.length - 1];
    if (lastWeek && lastWeek.length < 7) {
      while (lastWeek.length < 7) lastWeek.push(null);
    }

    return result;
  }, [days]);

  const completedCount = days.filter((d) => d.completed).length;

  if (loading) {
    return (
      <div className="h-20 flex items-center justify-center">
        <div className="h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted">過去1年の記録</span>
        <span className="text-xs text-muted tabular-nums">
          {completedCount}日達成
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-thin pb-1">
        <div className="inline-flex gap-[3px] min-w-0">
          {/* 曜日ラベル */}
          <div className="flex flex-col gap-[3px] mr-1 pt-0">
            {WEEKDAYS.map((day, i) => (
              <div
                key={day}
                className="h-[11px] w-3 flex items-center text-[9px] text-muted leading-none"
                style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* ヒートマップグリッド */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  className="h-[11px] w-[11px] rounded-[2px] transition-colors duration-150"
                  style={{
                    backgroundColor: day?.completed
                      ? color
                      : 'var(--color-surface-overlay)',
                    opacity: day?.completed ? 1 : 0.6,
                  }}
                  onMouseEnter={(e) => {
                    if (!day) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const date = new Date(day.date + 'T12:00:00');
                    const label = date.toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });
                    setTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      text: `${label} — ${day.completed ? '達成' : '未達成'}`,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-muted mr-1">少</span>
        {[0.15, 0.4, 0.7, 1].map((opacity) => (
          <div
            key={opacity}
            className="h-[11px] w-[11px] rounded-[2px]"
            style={{ backgroundColor: color, opacity }}
          />
        ))}
        <span className="text-[10px] text-muted ml-1">多</span>
      </div>

      {/* ツールチップ */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium
                     bg-foreground text-surface pointer-events-none
                     -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
