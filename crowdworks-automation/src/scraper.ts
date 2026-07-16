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

export interface LoginCheckDetail {
  loggedIn: boolean;
  hasLogoutLink: boolean;
  hasNotFoundMarker: boolean;
  loginLinkCount: number;
}

/**
 * ログイン状態を判定する。
 *
 * 【重要】未ログイン状態で /mypage にアクセスすると、クラウドワークスは
 * "/login" へリダイレクトせず、URLはそのまま /mypage で
 * 「ページが見つかりませんでした」という内容を返す(実機で確認済み)。
 * そのため URL に "/login" が含まれるかどうかだけでは絶対に判定しないこと
 * (未ログインを誤ってログイン済みと判定してしまう既知の不具合の原因だった)。
 *
 * 代わりに、ログイン後にしか表示されない要素の有無を複数組み合わせて判定する:
 *   - 「ログアウト」の文言がある(ログイン時のみ表示される)
 *   - 「ページが見つかりませんでした」が出ていない(未ログイン時のmypage特有の表示)
 *   - "/login" へ誘導するリンクが無い(ログイン済みなら通常表示されない)
 * 3条件すべてを満たした場合のみログイン済みと判定する。
 */
async function checkLoginState(page: Page): Promise<LoginCheckDetail> {
  await page.goto(MYPAGE_URL);
  await page.waitForLoadState("domcontentloaded");

  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasLogoutLink = bodyText.includes("ログアウト");
  const hasNotFoundMarker = bodyText.includes("ページが見つかりませんでした");
  const loginLinkCount = await page.locator('a[href*="/login"]').count();

  const loggedIn = hasLogoutLink && !hasNotFoundMarker && loginLinkCount === 0;

  return { loggedIn, hasLogoutLink, hasNotFoundMarker, loginLinkCount };
}

async function isLoggedIn(page: Page): Promise<boolean> {
  const detail = await checkLoginState(page);
  return detail.loggedIn;
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
    console.log(
      "クラウドワークスから届いた認証コードを、開いているブラウザの認証画面へ直接入力してください。" +
        "認証完了後、ターミナルへ戻ってEnterキーを押してください。"
    );
    console.log("========================================");
    // 認証コードそのものはここで受け取らない(Enterキーの通知のみ)。
    // ログ・ファイル・レポートのどこにも認証コードは保存されない。
    await waitForEnter("認証完了後、Enterを押してください: ");
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
  loginCheck: LoginCheckDetail;
}

/**
 * 保存済みセッション(data/session.json)があれば再利用してログイン状態を復元する。
 * セッションが無い、または失効している場合のみ実際のログイン処理を行い、
 * 2段階認証が要求されたらheadfulモードで一時停止して人間の入力を待つ。
 * ログイン後にしか表示されない要素で成功を再確認できた場合のみ、
 * 次回以降のためにセッションを保存する。確認できなければエラーで処理を中断する
 * (未ログイン状態の公開ページ取得を「ログイン成功」として扱わない)。
 * (認証コード自体はこの関数を含むコード上のどこにも保持・保存しない)
 */
export async function ensureLoggedIn(browser: Browser): Promise<LoginResult> {
  const sessionFileExisted = hasSavedSession();

  let context = await browser.newContext(
    sessionFileExisted ? { storageState: sessionFilePath } : {}
  );
  let page = await context.newPage();

  if (sessionFileExisted) {
    const detail = await checkLoginState(page);
    if (detail.loggedIn) {
      console.log("保存済みセッションでログインできました(認証コードの入力は不要です)。");
      return { context, page, usedSavedSession: true, twoFactorRequired: false, loginCheck: detail };
    }
    console.log("保存済みセッションが失効していました(ログイン後の要素を確認できませんでした)。再ログインします。");
  } else {
    console.log("保存済みセッション(data/session.json)が無いため、ログインします。");
  }

  // 失効/未使用のセッション情報を引きずらないよう、新しいまっさらなコンテキストでやり直す
  await context.close();
  context = await browser.newContext();
  page = await context.newPage();

  const { twoFactorRequired } = await performCredentialLogin(page);

  // ログイン処理完了後、ログイン後にしか表示されない要素で本当にログインできたか再確認する
  const confirmedDetail = await checkLoginState(page);
  if (!confirmedDetail.loggedIn) {
    throw new Error(
      "ログイン処理は完了しましたが、ログイン後にしか表示されない要素(ログアウトリンク等)を" +
        "確認できませんでした。ログインに失敗している可能性があるため処理を中断します。" +
        `(hasLogoutLink=${confirmedDetail.hasLogoutLink}, hasNotFoundMarker=${confirmedDetail.hasNotFoundMarker}, loginLinkCount=${confirmedDetail.loginLinkCount})`
    );
  }

  await saveSession(context);
  console.log(`ログイン成功を確認し、ログイン状態を保存しました: ${sessionFilePath}`);
  console.log("次回以降は、このセッションが有効な間、認証コードの入力は不要です。");

  return { context, page, usedSavedSession: false, twoFactorRequired, loginCheck: confirmedDetail };
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
