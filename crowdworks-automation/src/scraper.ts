import { createInterface } from "node:readline/promises";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { config } from "./config.js";
import { hasSavedSession, saveSession, sessionFilePath } from "./session.js";
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

const MYPAGE_URL = "https://crowdworks.jp/mypage";

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: !config.headful });
}

async function isLoggedIn(page: Page): Promise<boolean> {
  await page.goto(MYPAGE_URL);
  await page.waitForLoadState("domcontentloaded");
  return !page.url().includes("/login");
}

async function waitForEnter(promptText: string): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await rl.question(promptText);
  } finally {
    rl.close();
  }
}

/** ID/パスワードでログインし、2段階認証が要求された場合は人間の入力を待つ。戻り値は2段階認証が発生したかどうか */
async function performCredentialLogin(page: Page): Promise<{ twoFactorRequired: boolean }> {
  await page.goto("https://crowdworks.jp/login");
  await page.fill(SELECTORS.loginEmail, config.cwEmail);
  await page.fill(SELECTORS.loginPassword, config.cwPassword);
  await page.click(SELECTORS.loginSubmit);
  await page.waitForLoadState("domcontentloaded");

  let twoFactorRequired = false;

  if (page.url().includes("two_step_authentication")) {
    twoFactorRequired = true;
    if (!config.headful) {
      throw new Error(
        "2段階認証が必要ですが、ヘッドレスモードのため入力できません。" +
          "初回は `pnpm run run:test` または `pnpm run run:headful` で実行し、" +
          "ブラウザ上で認証コードを入力してセッションを保存してください。"
      );
    }
    console.log("");
    console.log("========================================");
    console.log("2段階認証が必要です。");
    console.log("クラウドワークスから届いた認証コードを、現在開いているブラウザの認証画面へ");
    console.log("直接入力してください。認証完了後、ターミナルへ戻ってEnterキーを押してください。");
    console.log("========================================");
    await waitForEnter("認証コード入力後、Enterを押してください: ");
    await page.waitForLoadState("domcontentloaded");
  }

  if (page.url().includes("/login") || page.url().includes("two_step_authentication")) {
    throw new Error(
      "ログインに失敗した可能性があります(ログイン/認証画面から遷移していません)。" +
        "メールアドレス・パスワード・認証コードを確認してください。"
    );
  }

  return { twoFactorRequired };
}

export interface LoginResult {
  context: BrowserContext;
  page: Page;
  usedSavedSession: boolean;
  twoFactorRequired: boolean;
}

/**
 * 保存済みセッション(data/session.json)があれば再利用してログイン状態を復元する。
 * セッションが無い、または失効している場合のみ実際のログイン処理を行い、
 * 2段階認証が要求されたらheadfulモードで一時停止して人間の入力を待つ。
 * ログインに成功したら、次回以降のためにセッションを保存する。
 * (認証コード自体はこの関数を含むコード上のどこにも保持・保存しない)
 */
export async function ensureLoggedIn(browser: Browser): Promise<LoginResult> {
  let context = await browser.newContext(
    hasSavedSession() ? { storageState: sessionFilePath } : {}
  );
  let page = await context.newPage();

  if (await isLoggedIn(page)) {
    console.log("保存済みセッションでログインできました(認証コードの入力は不要です)。");
    return { context, page, usedSavedSession: true, twoFactorRequired: false };
  }

  console.log(
    hasSavedSession()
      ? "保存済みセッションが失効していました。再ログインします。"
      : "保存済みセッションが無いため、ログインします。"
  );

  // 失効したセッション情報を引きずらないよう、新しいまっさらなコンテキストでやり直す
  await context.close();
  context = await browser.newContext();
  page = await context.newPage();

  const { twoFactorRequired } = await performCredentialLogin(page);
  await saveSession(context);
  console.log(`ログイン状態を保存しました: ${sessionFilePath}`);
  console.log("次回以降は、このセッションが有効な間、認証コードの入力は不要です。");

  return { context, page, usedSavedSession: false, twoFactorRequired };
}

/**
 * 案件詳細ページのURLは "/public/jobs/数字" の形式(例: /public/jobs/1234567)。
 * 検索結果一覧(/public/jobs/search)やカテゴリ・グループページ
 * (/public/jobs/category/xxx, /public/jobs/group/xxx 等)はこの形式に一致しないため、
 * この正規表現で個別の案件詳細ページだけに絞り込む。
 */
const JOB_DETAIL_URL_PATTERN = /\/public\/jobs\/(\d+)(?:[/?#]|$)/;

function extractJobId(url: string): string {
  const match = url.match(JOB_DETAIL_URL_PATTERN);
  return match ? match[1] : url;
}

export interface SearchScrapeResult {
  jobs: Job[];
  /** 案件詳細ページのURL形式に一致しなかったため除外したリンクの件数(カテゴリ・検索結果一覧等) */
  excludedNonJobLinkCount: number;
}

export async function scrapeSearch(
  page: Page,
  search: SearchCondition
): Promise<SearchScrapeResult> {
  await page.goto(search.searchUrl);
  await page.waitForLoadState("networkidle");

  const { matched, excludedCount } = await page.$$eval(SELECTORS.jobLink, (anchors) => {
    const jobDetailUrlPattern = /\/public\/jobs\/(\d+)(?:[/?#]|$)/;
    const seenAll = new Set<string>();
    const seenMatched = new Set<string>();
    const results: { url: string; title: string; context: string }[] = [];
    let excluded = 0;
    for (const a of anchors) {
      const href = (a as HTMLAnchorElement).href;
      if (seenAll.has(href)) continue;
      seenAll.add(href);
      if (!jobDetailUrlPattern.test(href)) {
        excluded += 1; // カテゴリ・検索結果一覧等の非案件ページ
        continue;
      }
      if (seenMatched.has(href)) continue;
      seenMatched.add(href);
      const container = a.closest("li, article, div") ?? a;
      results.push({
        url: href,
        title: (a.textContent ?? "").trim(),
        context: (container.textContent ?? "").trim(),
      });
    }
    return { matched: results, excludedCount: excluded };
  });

  const jobs = matched
    .filter((j) => j.title.length > 0)
    .map((j) => ({
      id: extractJobId(j.url),
      title: j.title,
      url: j.url,
      contextText: j.context,
      searchName: search.name,
    }));

  return { jobs, excludedNonJobLinkCount: excludedCount };
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
