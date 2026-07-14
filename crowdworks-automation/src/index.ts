import { loadSearchConditions } from "./config.js";
import { loadSeenJobIds, saveSeenJobIds } from "./store.js";
import { launchBrowser, login, scrapeSearch, scrapeJobDetail } from "./scraper.js";
import { generateDraft } from "./draftGenerator.js";
import { screenJob } from "./screening.js";
import { writeReport } from "./report.js";
import { matchesSearchCondition } from "./filters.js";
import type { Job, JobDraft, ScreenedJob } from "./types.js";

async function main() {
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
