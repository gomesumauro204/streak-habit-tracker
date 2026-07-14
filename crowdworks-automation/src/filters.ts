import type { Job, SearchCondition } from "./types.js";

/**
 * 案件一覧カードのテキストから金額らしき数値を抽出する。
 * CrowdWorksの表示ゆらぎ(範囲表記・カンマ区切りなど)を厳密にパースするのは難しいため、
 * 「見つかった数値のうち最大のもの」を採用する簡易ロジック。あくまで参考値。
 */
function extractMaxNumber(text: string): number | null {
  const matches = text.match(/[\d,]{3,}/g);
  if (!matches) return null;
  const numbers = matches.map((m) => Number(m.replace(/,/g, ""))).filter((n) => !Number.isNaN(n));
  return numbers.length > 0 ? Math.max(...numbers) : null;
}

/** 固定報酬案件の契約金額を推定(参考値) */
export function estimateFixedBudget(contextText: string): number | null {
  return extractMaxNumber(contextText);
}

/**
 * 時間単価案件の時給を推定(参考値)。
 * 「時給」「/時間」などの語の近くにある数値を優先し、見つからなければ最大値にフォールバック。
 */
export function estimateHourlyRate(contextText: string): number | null {
  const nearKeyword = contextText.match(/(?:時給|時間単価)[^\d]{0,5}([\d,]{3,})/);
  if (nearKeyword) {
    const n = Number(nearKeyword[1].replace(/,/g, ""));
    if (!Number.isNaN(n)) return n;
  }
  return extractMaxNumber(contextText);
}

/** 案件のタイトル・カードテキストに除外キーワードが含まれるか */
export function isExcludedByKeyword(job: Job, excludeKeywords?: string[]): boolean {
  if (!excludeKeywords || excludeKeywords.length === 0) return false;
  const text = `${job.title} ${job.contextText}`;
  return excludeKeywords.some((kw) => text.includes(kw));
}

/** 一覧カードに「新着」相当の表示があるか(参考値。表示ラベルの変更に弱い) */
export function hasNewBadge(contextText: string): boolean {
  return /新着|NEW\b/i.test(contextText);
}

/** 募集終了・受付終了になっていないか(参考値) */
export function isOpenForApplication(contextText: string): boolean {
  return !/募集終了|受付終了|募集は終了しました/.test(contextText);
}

/**
 * 検索条件に基づいて、この案件をレポート対象に含めるかどうかを判定する。
 * ここに条件を1つ追加するだけで、全ジャンル共通のフィルタとして機能する。
 */
export function matchesSearchCondition(job: Job, search: SearchCondition): boolean {
  if (isExcludedByKeyword(job, search.excludeKeywords)) return false;
  if (search.newOnly && !hasNewBadge(job.contextText)) return false;
  if (search.openOnly && !isOpenForApplication(job.contextText)) return false;

  const contractType = search.contractType ?? "fixed";

  if (contractType === "fixed" && search.minBudget !== undefined) {
    const budget = estimateFixedBudget(job.contextText);
    if (budget !== null && budget < search.minBudget) return false;
  }

  if (contractType === "hourly" && search.minHourlyRate !== undefined) {
    const rate = estimateHourlyRate(job.contextText);
    if (rate !== null && rate < search.minHourlyRate) return false;
  }

  return true;
}
