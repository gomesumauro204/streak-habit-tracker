import { loadSearchConditions } from "./config.js";
import { loadSeenJobIds, saveSeenJobIds } from "./store.js";
import { launchBrowser, login, scrapeSearch, scrapeJobDetail } from "./scraper.js";
import { generateDraft } from "./draftGenerator.js";
import { writeReport } from "./report.js";
import { matchesSearchCondition } from "./filters.js";
import type { Job, JobDraft } from "./types.js";

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

  console.log(`新着候補: ${newJobs.length}件`);

  const drafts: JobDraft[] = [];
  for (const job of newJobs) {
    console.log(`詳細取得・ドラフト作成中: ${job.title}`);
    const detail = await scrapeJobDetail(page, job);
    const draft = await generateDraft(detail);
    drafts.push({ ...detail, draft });
    seenJobIds.add(job.id);
  }

  await browser.close();

  saveSeenJobIds(seenJobIds);
  const reportPath = writeReport(drafts);
  console.log(`レポートを出力しました: ${reportPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
