import { chromium, type Browser, type Page } from "playwright";
import { config } from "./config.js";
import type { Job, JobWithDetail, SearchCondition } from "./types.js";

/**
 * NOTE: 下記のセレクタはCrowdWorksの現行UIをもとにした推測値。
 * サイトのマークアップ変更やA/Bテストで外れることがあるため、
 * 初回実行(HEADFUL=1 pnpm run:headful)で目視確認し、ズレていたら
 * ここを実際のDOMに合わせて調整すること。
 */
const SELECTORS = {
  loginEmail: 'input[name="username"]',
  loginPassword: 'input[name="password"]',
  loginSubmit: 'button[type="submit"]',
  jobLink: 'a[href^="/public/jobs/"]',
};

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: !config.headful });
}

export async function login(page: Page): Promise<void> {
  await page.goto("https://crowdworks.jp/login");
  await page.fill(SELECTORS.loginEmail, config.cwEmail);
  await page.fill(SELECTORS.loginPassword, config.cwPassword);
  await page.click(SELECTORS.loginSubmit);
  await page.waitForLoadState("networkidle");
}

function extractJobId(url: string): string {
  const match = url.match(/\/public\/jobs\/(\d+)/);
  return match ? match[1] : url;
}

export async function scrapeSearch(
  page: Page,
  search: SearchCondition
): Promise<Job[]> {
  await page.goto(search.searchUrl);
  await page.waitForLoadState("networkidle");

  const rawJobs = await page.$$eval(SELECTORS.jobLink, (anchors) => {
    const seen = new Set<string>();
    const results: { url: string; title: string; context: string }[] = [];
    for (const a of anchors) {
      const href = (a as HTMLAnchorElement).href;
      if (seen.has(href)) continue;
      seen.add(href);
      const container = a.closest("li, article, div") ?? a;
      results.push({
        url: href,
        title: (a.textContent ?? "").trim(),
        context: (container.textContent ?? "").trim(),
      });
    }
    return results;
  });

  return rawJobs
    .filter((j) => j.title.length > 0)
    .map((j) => ({
      id: extractJobId(j.url),
      title: j.title,
      url: j.url,
      budgetText: j.context,
      postedAtText: "",
      searchName: search.name,
    }));
}

export async function scrapeJobDetail(
  page: Page,
  job: Job
): Promise<JobWithDetail> {
  await page.goto(job.url);
  await page.waitForLoadState("networkidle");
  const description = await page.evaluate(() => document.body.innerText);
  return { ...job, description: description.slice(0, 6000) };
}
