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

/**
 * ログイン確認に使うページ。
 *
 * 【重要】以前は /mypage を使っていたが、これは未ログイン・ログイン済み
 * どちらの状態でアクセスしても "/login" へリダイレクトされず、常に
 * 「ページが見つかりませんでした」を返す実質的に無効なURLだった(実機で確認済み)。
 * そのため /mypage の表示内容ではログイン状態を正しく判定できない。
 *
 * /dashboard は認証必須のページで、未ログイン時は確実に /login へ
 * リダイレクトされることを実機で確認済み(2026-07-16)。ログイン済みの場合は
 * 「マイページ」の見出し・契約一覧・報酬・メッセージ等のナビゲーションを含む
 * ダッシュボード画面が表示される。
 */
const DASHBOARD_URL = "https://crowdworks.jp/dashboard";

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: !config.headful });
}

export interface LoginCheckDetail {
  loggedIn: boolean;
  url: string;
  /** ログインフォーム(email入力欄)が存在するか。存在すれば未ログイン確定 */
  hasLoginForm: boolean;
  /** URLが /login を含むか。含めば未ログイン確定 */
  isLoginUrl: boolean;
  /** 「マイページ」の見出しがあるか */
  hasMyPageHeading: boolean;
  /** 「クライアントメニューに切り替える」があるか */
  hasClientMenuSwitch: boolean;
  /** 「(何か)さん」という形式のアカウント名表示があるか */
  hasAccountNamePattern: boolean;
  /** 「契約一覧」のナビゲーションがあるか */
  hasContractListNav: boolean;
  /** 「報酬」のナビゲーションがあるか */
  hasRewardNav: boolean;
  /** 「メッセージ」のナビゲーションがあるか */
  hasMessageNav: boolean;
  /** 上記ログイン後専用要素のうち、いくつ一致したか */
  positiveMatchCount: number;
}

function logLoginCheckDetail(detail: LoginCheckDetail): void {
  console.log("[login-check] 現在のURL:", detail.url);
  console.log(
    `[login-check] ログインフォーム(input[name="username"])の有無: ${detail.hasLoginForm}(あれば未ログイン確定)`
  );
  console.log(`[login-check] URLに/loginを含むか: ${detail.isLoginUrl}(含めば未ログイン確定)`);
  console.log(`[login-check] 「マイページ」見出し: ${detail.hasMyPageHeading}`);
  console.log(`[login-check] 「クライアントメニューに切り替える」: ${detail.hasClientMenuSwitch}`);
  console.log(`[login-check] アカウント名パターン(「〜さん」): ${detail.hasAccountNamePattern}`);
  console.log(`[login-check] 「契約一覧」ナビゲーション: ${detail.hasContractListNav}`);
  console.log(`[login-check] 「報酬」ナビゲーション: ${detail.hasRewardNav}`);
  console.log(`[login-check] 「メッセージ」ナビゲーション: ${detail.hasMessageNav}`);
  console.log(`[login-check] ログイン後専用要素の一致数: ${detail.positiveMatchCount}件(2件以上で判定対象)`);
}

/**
 * ログイン状態を判定する。認証情報・Cookieの中身・認証コードはログに一切出力しない。
 *
 * 判定ルール: 以下の除外条件に該当せず、かつログイン後専用要素が2件以上一致した場合のみ
 * ログイン済みと判定する。
 *   除外条件: ログインフォームが存在する / URLが /login を含む
 *   ログイン後専用要素: 「マイページ」見出し・「クライアントメニューに切り替える」・
 *     「〜さん」のアカウント名表示・「契約一覧」・「報酬」・「メッセージ」ナビゲーション
 */
async function checkLoginState(page: Page): Promise<LoginCheckDetail> {
  await page.goto(DASHBOARD_URL);
  await page.waitForLoadState("networkidle");

  const url = page.url();
  const bodyText = await page.evaluate(() => document.body.innerText);

  const hasLoginForm = (await page.locator('input[name="username"]').count()) > 0;
  const isLoginUrl = url.includes("/login");

  const hasMyPageHeading = bodyText.includes("マイページ");
  const hasClientMenuSwitch = bodyText.includes("クライアントメニューに切り替える");
  const hasAccountNamePattern = /\S+さん/.test(bodyText);
  const hasContractListNav = bodyText.includes("契約一覧");
  const hasRewardNav = bodyText.includes("報酬");
  const hasMessageNav = bodyText.includes("メッセージ");

  const positiveMatchCount = [
    hasMyPageHeading,
    hasClientMenuSwitch,
    hasAccountNamePattern,
    hasContractListNav,
    hasRewardNav,
    hasMessageNav,
  ].filter(Boolean).length;

  const loggedIn = !hasLoginForm && !isLoginUrl && positiveMatchCount >= 2;

  const detail: LoginCheckDetail = {
    loggedIn,
    url,
    hasLoginForm,
    isLoginUrl,
    hasMyPageHeading,
    hasClientMenuSwitch,
    hasAccountNamePattern,
    hasContractListNav,
    hasRewardNav,
    hasMessageNav,
    positiveMatchCount,
  };

  if (!loggedIn) {
    logLoginCheckDetail(detail);
  }

  return detail;
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
      "ログイン処理は完了しましたが、ログイン後にしか表示されない要素を" +
        `確認できませんでした(一致数=${confirmedDetail.positiveMatchCount}件、2件以上が必要)。` +
        "ログインに失敗している可能性があるため処理を中断します。詳細は直前のログを参照してください。"
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
