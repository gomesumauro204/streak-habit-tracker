import { loadSearchConditions } from "./config.js";
import { loadSeenJobIds, saveSeenJobIds } from "./store.js";
import { launchBrowser, login, scrapeSearch, scrapeJobDetail } from "./scraper.js";
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

async function main() {
  ensureConfigsUpToDate();

  const { searches } = loadSearchConditions();
  const seenJobIds = loadSeenJobIds();

  const browser = await launchBrowser();
  const page = await browser.newPage();

  console.log("ログイン中...");
  await login(page);

  const newJobs: Job[] = [];
  for (const search of searches) {
    console.log(`検索中: ${search.name}`);
    const jobs = await scrapeSearch(page, search);
    for (const job of jobs) {
      if (seenJobIds.has(job.id)) continue;
      if (!matchesSearchCondition(job, search)) continue;
      newJobs.push(job);
    }
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

    console.log(`ドラフト作成中: ${job.title}`);
    const draft = await generateDraft(detail);
    drafts.push({ ...detail, draft });
  }

  await browser.close();

  console.log(`応募対象: ${drafts.length}件 / 除外: ${rejected.length}件`);

  saveSeenJobIds(seenJobIds);
  const reportPath = writeReport(drafts, rejected);
  console.log(`レポートを出力しました: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
