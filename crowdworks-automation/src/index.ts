import { loadSearchConditions } from "./config.js";
import { loadSeenJobIds, saveSeenJobIds } from "./store.js";
import { launchBrowser, ensureLoggedIn, scrapeSearch, scrapeJobDetail } from "./scraper.js";
import { generateDraft } from "./draftGenerator.js";
import { screenJob } from "./screening.js";
import { writeReport, type SearchRunStat } from "./report.js";
import { matchesSearchCondition } from "./filters.js";
import { findManagedConfigs, checkConfig, syncConfig } from "./configSync.js";
import { estimateCostUsd, sumUsage } from "./pricing.js";
import type { Job, JobClassification, JobDraft, ScreenedJob, SearchCondition, TokenUsage } from "./types.js";

/**
 * 起動時に設定ファイル(*.yaml)の状態を確認する。
 * - まだ存在しないファイルは example から自動作成する(失うものが無いため安全)
 * - 既存ファイルに不足項目がある場合は警告のみ行い、ファイルは書き換えない
 *   (実際にマージするには `pnpm run config:update` を明示的に実行する)
 */
function ensureConfigsUpToDate() {
  for (const cfg of findManagedConfigs()) {
    const result = checkConfig(cfg);
    if (result.isNew) {
      syncConfig(cfg, { write: true });
      console.log(`[config] ${cfg.name}.yaml が無かったため ${cfg.name}.example.yaml から作成しました。内容を編集してください。`);
      continue;
    }
    if (result.missing.length > 0) {
      console.warn(
        `[config] ${cfg.name}.yaml に不足項目があります: ${result.missing.join(", ")}`
      );
      console.warn("[config] 反映するには: pnpm run config:update");
    }
  }
}

/**
 * コマンドライン引数から検索条件の選び方を解釈する。
 *   --search "名前"      : 指定した名前(完全一致)の条件だけを使う(複数指定可)
 *   --search-all         : すべての検索条件を使う
 * どちらも指定が無い場合は null を返し、呼び出し側で従来のデフォルト挙動にフォールバックする。
 */
function parseCliArgs(argv: string[]): { searchNames: string[]; all: boolean } {
  const searchNames: string[] = [];
  let all = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--search-all") {
      all = true;
    } else if (argv[i] === "--search") {
      const value = argv[i + 1];
      if (value) {
        searchNames.push(value);
        i++;
      }
    }
  }
  return { searchNames, all };
}

function resolveSearches(allSearches: SearchCondition[]): SearchCondition[] {
  const { searchNames, all } = parseCliArgs(process.argv.slice(2));

  if (all) {
    return allSearches;
  }

  if (searchNames.length > 0) {
    const notFound = searchNames.filter((name) => !allSearches.some((s) => s.name === name));
    if (notFound.length > 0) {
      console.error(`指定された検索条件が見つかりません: ${notFound.join(", ")}`);
      console.error("利用可能な検索条件名:");
      for (const s of allSearches) console.error(`  - ${s.name}`);
      process.exit(1);
    }
    // 指定順ではなく、search-conditions.yaml上の順序で処理する
    return allSearches.filter((s) => searchNames.includes(s.name));
  }

  return searchLimit ? allSearches.slice(0, searchLimit) : allSearches;
}

function classificationLabel(c: JobClassification): string {
  if (c === "priority") return "優先応募候補";
  if (c === "candidate") return "応募候補";
  if (c === "review") return "要確認";
  return "除外";
}

/**
 * テスト実行用の上限設定(環境変数で指定)。通常運用時はすべて未設定(=無制限)で動作する。
 * - TEST_MODE=1            : 既読管理(data/seen-jobs.json)を更新しない(テストが本番の重複判定に影響しないようにする)
 * - TEST_SEARCH_LIMIT=n    : (--search/--search-all未指定時のみ)先頭 n 件の検索条件だけ使う
 * - TEST_JOB_LIMIT=n       : 検索条件ごとに、詳細取得・判定の対象を先頭 n 件までに絞る
 * - TEST_DRAFT_LIMIT=n     : 応募文ドラフトの生成を、優先応募候補→応募候補の順で上位 n 件までに絞る
 */
const testMode = process.env.TEST_MODE === "1";
const searchLimit = process.env.TEST_SEARCH_LIMIT ? Number(process.env.TEST_SEARCH_LIMIT) : undefined;
const perSearchJobLimit = process.env.TEST_JOB_LIMIT ? Number(process.env.TEST_JOB_LIMIT) : undefined;
const draftLimit = process.env.TEST_DRAFT_LIMIT ? Number(process.env.TEST_DRAFT_LIMIT) : undefined;

async function main() {
  ensureConfigsUpToDate();

  const { searches: allSearches } = loadSearchConditions();
  const searches = resolveSearches(allSearches);

  if (testMode) {
    console.log(
      `[テストモード] 検索条件=${searches.map((s) => s.name).join(", ")} / job(条件毎)=${perSearchJobLimit ?? "無制限"} / draft=${draftLimit ?? "無制限"} / 既読状態は更新しません`
    );
  }

  const seenJobIds = loadSeenJobIds();

  const browser = await launchBrowser();
  const { page, usedSavedSession, twoFactorRequired } = await ensureLoggedIn(browser);

  const newJobs: Job[] = [];
  const searchStats: SearchRunStat[] = [];
  let totalBeforeDedup = 0;
  const errors: string[] = [];

  for (const search of searches) {
    console.log(`検索中: ${search.name}`);
    const { jobs, excludedNonJobLinkCount } = await scrapeSearch(page, search);
    totalBeforeDedup += jobs.length;

    let addedForThisSearch = 0;
    for (const job of jobs) {
      if (perSearchJobLimit && addedForThisSearch >= perSearchJobLimit) break;
      if (seenJobIds.has(job.id)) continue;
      if (newJobs.some((j) => j.id === job.id)) continue; // 同一案件の重複除外
      if (!matchesSearchCondition(job, search)) continue;
      newJobs.push(job);
      addedForThisSearch++;
    }

    searchStats.push({
      name: search.name,
      searchUrl: search.searchUrl,
      rawJobCount: jobs.length,
      excludedNonJobLinkCount,
    });
  }

  console.log(`新着候補(検索条件一致・重複除外後): ${newJobs.length}件`);

  const priority: (ScreenedJob | JobDraft)[] = [];
  const candidate: (ScreenedJob | JobDraft)[] = [];
  const review: ScreenedJob[] = [];
  const excluded: ScreenedJob[] = [];

  for (const job of newJobs) {
    try {
      console.log(`詳細取得中: ${job.title}`);
      const detail = await scrapeJobDetail(page, job);
      // 検索条件に一致しただけの案件を毎回再判定しないよう、ここで既読に追加する
      seenJobIds.add(job.id);

      console.log(`応募対象判定中: ${job.title}`);
      const { result: screening } = await screenJob(detail);
      const screenedJob: ScreenedJob = { ...detail, screening };
      console.log(`  → ${classificationLabel(screening.classification)}: ${screening.reason}`);

      if (screening.classification === "priority") priority.push(screenedJob);
      else if (screening.classification === "candidate") candidate.push(screenedJob);
      else if (screening.classification === "review") review.push(screenedJob);
      else excluded.push(screenedJob);
    } catch (err) {
      const message = `${job.title}: ${(err as Error).message}`;
      console.error(`  → エラー(この案件をスキップ): ${message}`);
      errors.push(message);
    }
  }

  // ドラフト生成は「優先応募候補」→「応募候補」の順で上位 draftLimit 件のみ
  const draftEligible = [...priority, ...candidate] as ScreenedJob[];
  const draftTargets = draftLimit ? draftEligible.slice(0, draftLimit) : draftEligible;

  const draftUsages: TokenUsage[] = [];
  let draftSuccessCount = 0;
  let draftFailCount = 0;

  for (const job of draftTargets) {
    console.log(`ドラフト作成中: ${job.title}`);
    const outcome = await generateDraft(job, job.screening.metadata);
    draftUsages.push(...outcome.usages);

    if (outcome.success && outcome.result) {
      draftSuccessCount++;
      const jobDraft: JobDraft = { ...job, draftResult: outcome.result };
      const pIdx = priority.findIndex((j) => j.id === job.id);
      if (pIdx >= 0) {
        priority[pIdx] = jobDraft;
        continue;
      }
      const cIdx = candidate.findIndex((j) => j.id === job.id);
      if (cIdx >= 0) candidate[cIdx] = jobDraft;
    } else {
      draftFailCount++;
      const message = `${job.title}(応募文生成失敗、${outcome.attempts}回試行): ${outcome.failureReason}`;
      console.error(`  → ${message}`);
      errors.push(message);
    }
  }

  await browser.close();

  const draftUsageTotal = sumUsage(draftUsages);
  console.log(
    `応募文生成: 成功${draftSuccessCount}件 / 失敗${draftFailCount}件 / 入力${draftUsageTotal.inputTokens}トークン / 出力${draftUsageTotal.outputTokens}トークン / 概算$${estimateCostUsd(draftUsageTotal).toFixed(4)}`
  );

  console.log(
    `優先応募候補: ${priority.length}件 / 応募候補: ${candidate.length}件 / 要確認: ${review.length}件 / 除外: ${excluded.length}件`
  );

  if (testMode) {
    console.log("[テストモード] 既読状態(data/seen-jobs.json)は更新していません");
  } else {
    saveSeenJobIds(seenJobIds);
  }

  const reportPath = writeReport({
    meta: {
      usedSavedSession,
      twoFactorRequired,
      searches: searchStats,
      totalBeforeDedup,
      totalAfterDedup: newJobs.length,
      errors,
      draftSuccessCount,
      draftFailCount,
      draftUsageTotal,
      draftCostUsd: estimateCostUsd(draftUsageTotal),
    },
    priority,
    candidate,
    review,
    excluded,
  });
  console.log(`レポートを出力しました: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
