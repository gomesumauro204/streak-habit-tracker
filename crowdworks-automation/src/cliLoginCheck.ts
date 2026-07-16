/**
 * ログイン確認だけを行う安全なテストスクリプト。
 * 案件検索・案件取得・AI判定・応募文生成・応募操作は一切行わない。
 * 認証コードそのものはこのスクリプト・ログ・ファイルのどこにも保存しない。
 */
import { existsSync } from "node:fs";
import { launchBrowser, ensureLoggedIn } from "./scraper.js";
import { sessionFilePath } from "./session.js";
import { config } from "./config.js";

async function main() {
  console.log("========================================");
  console.log("ログイン確認テスト(検索・取得・判定・応募文生成・応募操作は行いません)");
  console.log("========================================");
  console.log("");

  const sessionExistedBefore = existsSync(sessionFilePath);
  console.log(`data/session.json の有無(実行前): ${sessionExistedBefore ? "あり" : "なし"}`);

  if (!config.headful) {
    console.log("⚠ ヘッドレスモードで実行されています。2段階認証が必要な場合は失敗します。");
    console.log("  `pnpm run login:check` (headfulモード)での実行を推奨します。");
  }

  const browser = await launchBrowser();
  let result: Awaited<ReturnType<typeof ensureLoggedIn>> | undefined;
  let loginError: Error | undefined;

  try {
    result = await ensureLoggedIn(browser);
  } catch (err) {
    loginError = err as Error;
  }

  await browser.close();

  const sessionExistsAfter = existsSync(sessionFilePath);

  console.log("");
  console.log("========================================");
  console.log("結果");
  console.log("========================================");

  if (loginError) {
    console.log("❌ ログインに失敗しました。案件取得・AI判定は実行していません。");
    console.log(`   エラー: ${loginError.message}`);
    console.log(`data/session.json の有無(実行後): ${sessionExistsAfter ? "あり" : "なし"}`);
    process.exitCode = 1;
    return;
  }

  const r = result!;
  console.log(`✅ ログイン成功を確認しました。`);
  console.log(`- 保存済みセッションを使用したか: ${r.usedSavedSession ? "はい" : "いいえ(新規ログイン)"}`);
  console.log(`- 手動ログイン(ID/パスワード)が必要だったか: ${r.usedSavedSession ? "いいえ" : "はい"}`);
  console.log(`- 認証コード入力が必要だったか: ${r.twoFactorRequired ? "はい" : "いいえ"}`);
  console.log("- ログイン後の固有要素の確認結果:");
  console.log(`    ログアウトリンクあり: ${r.loginCheck.hasLogoutLink}`);
  console.log(`    「ページが見つかりませんでした」表示なし: ${!r.loginCheck.hasNotFoundMarker}`);
  console.log(`    /loginへのリンク数: ${r.loginCheck.loginLinkCount}(0であることを期待)`);
  console.log(`data/session.json の有無(実行前→実行後): ${sessionExistedBefore ? "あり" : "なし"} → ${sessionExistsAfter ? "あり" : "なし"}`);
  console.log("");
  console.log("案件検索・案件取得・AI判定・応募文生成・応募操作は行っていません。");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
