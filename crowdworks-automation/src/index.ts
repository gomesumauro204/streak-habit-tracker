import { loadSearchConditions } from "./config.js";
import { loadSeenJobIds, saveSeenJobIds } from "./store.js";
import { launchBrowser, ensureLoggedIn, scrapeSearch, scrapeJobDetail } from "./scraper.js";
import { generateDraft } from "./draftGenerator.js";
import { screenJob } from "./screening.js";
import { writeReport } from "./report.js";
import { matchesSearchCondition } from "./filters.js";
import { findManagedConfigs, checkConfig, syncConfig } from "./configSync.js";
import type { Job, JobDraft, ScreenedJob } from "./types.js";

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
 * テスト実行用の上限設定(環境変数で指定)。
 * 通常運用時はすべて未設定(=無制限)で動作する。
 * - TEST_MODE=1            : 既読管理(data/seen-jobs.json)を更新しない(テストが本番の重複判定に影響しないようにする)
 * - TEST_SEARCH_LIMIT=n    : 先頭 n 件の検索条件だけ使う
 * - TEST_JOB_LIMIT=n       : 詳細取得・判定の対象を先頭 n 件までに絞る
 * - TEST_DRAFT_LIMIT=n     : 応募文ドラフトの生成を先頭 n 件までに絞る(採用された案件のうち)
 */
const testMode = process.env.TEST_MODE === "1";
const searchLimit = process.env.TEST_SEARCH_LIMIT ? Number(process.env.TEST_SEARCH_LIMIT) : undefined;
const jobLimit = process.env.TEST_JOB_LIMIT ? Number(process.env.TEST_JOB_LIMIT) : undefined;
const draftLimit = process.env.TEST_DRAFT_LIMIT ? Number(process.env.TEST_DRAFT_LIMIT) : undefined;

async function main() {
  ensureConfigsUpToDate();

  if (testMode) {
    console.log(
      `[テストモード] search=${searchLimit ?? "無制限"} / job=${jobLimit ?? "無制限"} / draft=${draftLimit ?? "無制限"} / 既読状態は更新しません`
    );
  }

  const { searches: allSearches } = loadSearchConditions();
  const searches = searchLimit ? allSearches.slice(0, searchLimit) : allSearches;
  const seenJobIds = loadSeenJobIds();

  const browser = await launchBrowser();
  const { page } = await ensureLoggedIn(browser);

  const newJobs: Job[] = [];
  for (const search of searches) {
    console.log(`検索中: ${search.name}`);
    const jobs = await scrapeSearch(page, search);
    for (const job of jobs) {
      if (seenJobIds.has(job.id)) continue;
      if (newJobs.some((j) => j.id === job.id)) continue; // 同一案件の重複除外
      if (!matchesSearchCondition(job, search)) continue;
      newJobs.push(job);
      if (jobLimit && newJobs.length >= jobLimit) break;
    }
    if (jobLimit && newJobs.length >= jobLimit) break;
  }

  console.log(`新着候補(検索条件一致): ${newJobs.length}件`);

  const drafts: JobDraft[] = [];
  const rejected: ScreenedJob[] = [];

  for (const job of newJobs) {
    console.log(`詳細取得中: ${job.title}`);
    const detail = await scrapeJobDetail(page, job);
    // 検索条件に一致しただけの案件を毎回再判定しないよう、ここで既読に追加する
    seenJobIds.add(job.id);

    console.log(`応募対象判定中: ${job.title}`);
    const screening = await screenJob(detail);
    if (!screening.accepted) {
      console.log(`  → 除外: ${screening.reason}`);
      rejected.push({ ...detail, screening });
      continue;
    }
    console.log(`  → 採用: ${screening.reason}`);

    if (draftLimit && drafts.length >= draftLimit) {
      console.log("  → 応募文生成は上限に達したためスキップ(採用扱いのまま集計)");
      drafts.push({ ...detail, draft: "(テストモード: 上限のため応募文は生成していません)" });
      continue;
    }

    console.log(`ドラフト作成中: ${job.title}`);
    const draft = await generateDraft(detail);
    drafts.push({ ...detail, draft });
  }

  await browser.close();

  console.log(`応募対象: ${drafts.length}件 / 除外: ${rejected.length}件`);

  if (testMode) {
    console.log("[テストモード] 既読状態(data/seen-jobs.json)は更新していません");
  } else {
    saveSeenJobIds(seenJobIds);
  }
  const reportPath = writeReport(drafts, rejected);
  console.log(`レポートを出力しました: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
