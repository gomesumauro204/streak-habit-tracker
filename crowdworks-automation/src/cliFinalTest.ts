/**
 * 半自動応募ツールの最終テスト(実案件1件)。
 *
 * 流れ: 保存済みセッションで実ログイン確認 → 指定した検索条件のみで案件取得
 *       → AIで応募対象を判定(候補が見つかった時点で停止)→ 候補1件の応募文を作成
 *       → 結果をターミナルとMarkdownレポートに出力
 *
 * 応募ボタンのクリック・応募送信・メッセージ送信・契約操作は一切行わない。
 * 既読(data/seen-jobs.json)は読み取りのみで、このテストでは更新しない
 * (テスト実行が本番の重複判定に影響しないようにするため)。
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSearchConditions, config } from "./config.js";
import { loadSeenJobIds } from "./store.js";
import { launchBrowser, ensureLoggedIn, scrapeSearch, scrapeJobDetail } from "./scraper.js";
import { generateDraft } from "./draftGenerator.js";
import { screenJob } from "./screening.js";
import { matchesSearchCondition } from "./filters.js";
import { estimateCostUsd, sumUsage } from "./pricing.js";
import type { JobClassification, ScreenedJob, TokenUsage } from "./types.js";

const TARGET_SEARCH_NAME = "エンジニア(固定報酬)";
const MAX_JOBS_TO_CHECK = 10;

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function classificationLabel(c: JobClassification): string {
  if (c === "priority") return "優先応募候補";
  if (c === "candidate") return "応募候補";
  if (c === "review") return "要確認";
  return "除外";
}

async function main() {
  const { searches } = loadSearchConditions();
  const target = searches.find((s) => s.name === TARGET_SEARCH_NAME);
  if (!target) {
    console.error(`指定された検索条件が見つかりません: ${TARGET_SEARCH_NAME}`);
    console.error("利用可能な検索条件名:");
    for (const s of searches) console.error(`  - ${s.name}`);
    process.exit(1);
  }

  console.log("========================================");
  console.log("半自動応募ツール 最終テスト(実案件1件)");
  console.log("========================================");
  console.log(`使用する検索条件: ${target.name}`);
  console.log(`searchUrl: ${target.searchUrl}`);
  console.log("");

  const seenJobIds = loadSeenJobIds();

  const browser = await launchBrowser();
  let loginResult: Awaited<ReturnType<typeof ensureLoggedIn>>;
  try {
    loginResult = await ensureLoggedIn(browser);
  } catch (err) {
    await browser.close();
    console.error("");
    console.error("❌ ログインに失敗しました。案件検索・取得・AI判定は実行していません。");
    console.error((err as Error).message);
    process.exitCode = 1;
    return;
  }
  const { page, usedSavedSession, twoFactorRequired } = loginResult;
  console.log(
    `✅ ログイン確認: 成功(保存済みセッション使用=${usedSavedSession ? "はい" : "いいえ"}, 認証コード入力=${twoFactorRequired ? "はい" : "いいえ"})`
  );
  console.log("");

  console.log(`検索中: ${target.name}`);
  const { jobs } = await scrapeSearch(page, target);
  console.log(`案件詳細ページ: ${jobs.length}件(重複除外・検索条件フィルタ前)`);
  console.log("");

  let checkedCount = 0;
  let excludedCount = 0;
  let reviewCount = 0;
  const excludedReasons: string[] = [];
  let candidate: ScreenedJob | null = null;
  const screeningUsages: TokenUsage[] = [];

  for (const job of jobs) {
    if (checkedCount >= MAX_JOBS_TO_CHECK) break;
    if (seenJobIds.has(job.id)) continue; // 過去に判定済みの案件は再判定しない
    if (!matchesSearchCondition(job, target)) continue;

    checkedCount++;
    console.log(`[${checkedCount}/${MAX_JOBS_TO_CHECK}] 詳細取得中: ${job.title}`);
    const detail = await scrapeJobDetail(page, job);

    console.log(`  応募対象判定中...`);
    const { result: screening, usage } = await screenJob(detail);
    screeningUsages.push(usage);
    console.log(`  → ${classificationLabel(screening.classification)}: ${screening.reason}`);

    if (screening.classification === "priority" || screening.classification === "candidate") {
      candidate = { ...detail, screening };
      break; // 応募候補が見つかった時点で以降の案件確認を停止
    }
    if (screening.classification === "review") {
      reviewCount++;
    } else {
      excludedCount++;
      excludedReasons.push(`${job.title}: ${screening.reason}`);
    }
  }

  await browser.close();
  console.log("");
  console.log(`案件確認数: ${checkedCount}件 / 除外: ${excludedCount}件 / 要確認: ${reviewCount}件`);
  console.log("[テスト] 既読状態(data/seen-jobs.json)は更新していません");

  const screeningUsageTotal = sumUsage(screeningUsages);

  let draftUsageTotal: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let draftOutcome: Awaited<ReturnType<typeof generateDraft>> | null = null;

  if (candidate) {
    console.log("");
    console.log(`ドラフト作成中: ${candidate.title}`);
    draftOutcome = await generateDraft(candidate, candidate.screening.metadata);
    draftUsageTotal = sumUsage(draftOutcome.usages);
  }

  const totalUsage: TokenUsage = {
    inputTokens: screeningUsageTotal.inputTokens + draftUsageTotal.inputTokens,
    outputTokens: screeningUsageTotal.outputTokens + draftUsageTotal.outputTokens,
  };
  const totalCost = estimateCostUsd(totalUsage);

  const lines: string[] = [];
  lines.push(`# 最終テストレポート (${timestamp()})`);
  lines.push("");
  lines.push("**このレポートはテスト用です。応募の送信・応募ボタンのクリック・メッセージ送信・契約操作は一切行っていません。**");
  lines.push("");
  lines.push(`- 使用した検索条件: ${target.name}`);
  lines.push(`- searchUrl: ${target.searchUrl}`);
  lines.push(`- 保存済みセッションを使用したか: ${usedSavedSession ? "はい" : "いいえ(新規ログイン)"}`);
  lines.push(`- 手動ログインが必要だったか: ${usedSavedSession ? "いいえ" : "はい"}`);
  lines.push(`- 認証コード入力が必要だったか: ${twoFactorRequired ? "はい" : "いいえ"}`);
  lines.push(`- 確認した案件数: ${checkedCount}件`);
  lines.push(`- 除外: ${excludedCount}件 / 要確認: ${reviewCount}件`);
  lines.push(`- 使用トークン: 入力${totalUsage.inputTokens.toLocaleString()} / 出力${totalUsage.outputTokens.toLocaleString()}`);
  lines.push(`- 概算APIコスト: $${totalCost.toFixed(4)}`);
  lines.push(`- 応募送信: 行っていません`);
  lines.push("");

  console.log("");
  console.log("========================================");

  if (candidate && draftOutcome) {
    const d = draftOutcome;
    console.log("【応募候補が見つかりました】");
    console.log("========================================");
    console.log(`案件タイトル: ${candidate.title}`);
    console.log(`案件URL: ${candidate.url}`);
    console.log(`契約方式: ${candidate.screening.metadata.budgetOrRate ? "(下記報酬欄参照)" : "不明"}`);
    console.log(`報酬: ${candidate.screening.metadata.budgetOrRate ?? "不明"}`);
    console.log(`応募理由: ${candidate.screening.reason}`);
    if (d.success && d.result) {
      console.log("");
      console.log("--- 応募文 ---");
      console.log(d.result.draft);
      console.log("--------------");
      console.log(`懸念点: ${d.result.concerns || "(記載なし)"}`);
      console.log(
        `確認質問: ${d.result.questionsToConfirm.length > 0 ? d.result.questionsToConfirm.join(" / ") : "(記載なし)"}`
      );
      console.log(`提案金額/時間単価: ${d.result.suggestedRate || "(記載なし)"}`);
    } else {
      console.log(`⚠ 応募文生成に失敗しました: ${d.failureReason}`);
    }
    console.log(`確認した案件数: ${checkedCount}件 / 除外: ${excludedCount}件`);
    console.log(`使用トークン: 入力${totalUsage.inputTokens} / 出力${totalUsage.outputTokens} / 概算$${totalCost.toFixed(4)}`);
    console.log("応募送信は行っていません。");
    console.log("========================================");

    lines.push("## 【応募候補が見つかりました】");
    lines.push("");
    lines.push(`- 案件タイトル: ${candidate.title}`);
    lines.push(`- 案件URL: ${candidate.url}`);
    lines.push(`- 報酬: ${candidate.screening.metadata.budgetOrRate ?? "不明"}`);
    lines.push(`- 必須条件: ${candidate.screening.metadata.requiredConditions ?? "不明"}`);
    lines.push(`- 応募理由: ${candidate.screening.reason}`);
    lines.push("");
    if (d.success && d.result) {
      lines.push("### 応募文");
      lines.push("");
      lines.push(d.result.draft);
      lines.push("");
      lines.push(`- この案件を応募候補にした理由: ${d.result.candidacyReason || "(記載なし)"}`);
      lines.push(`- 懸念点: ${d.result.concerns || "(記載なし)"}`);
      lines.push(
        `- 応募前に確認したい質問: ${
          d.result.questionsToConfirm.length > 0
            ? d.result.questionsToConfirm.map((q) => `\n  - ${q}`).join("")
            : "(記載なし)"
        }`
      );
      lines.push(`- 提案する契約金額/時間単価の考え方: ${d.result.suggestedRate || "(記載なし)"}`);
    } else {
      lines.push(`**応募文生成に失敗しました**: ${d.failureReason}`);
    }
  } else {
    console.log("【今回の検索では応募候補が見つかりませんでした】");
    console.log("========================================");
    console.log(`保存済みセッションを使用したか: ${usedSavedSession ? "はい" : "いいえ"}`);
    console.log(`確認した件数: ${checkedCount}件 / 除外: ${excludedCount}件 / 要確認: ${reviewCount}件`);
    console.log("主な除外理由:");
    for (const r of excludedReasons.slice(0, 5)) console.log(`  - ${r}`);
    console.log(`使用トークン: 入力${totalUsage.inputTokens} / 出力${totalUsage.outputTokens} / 概算$${totalCost.toFixed(4)}`);
    console.log("応募送信は行っていません。");
    console.log("========================================");

    lines.push("## 【今回の検索では応募候補が見つかりませんでした】");
    lines.push("");
    lines.push("### 除外理由");
    lines.push("");
    if (excludedReasons.length > 0) {
      for (const r of excludedReasons) lines.push(`- ${r}`);
    } else {
      lines.push("(除外理由の記録なし)");
    }
  }

  lines.push("");

  const reportsDir = join(config.dataDir, "reports");
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
  const path = join(reportsDir, `${timestamp()}-final-test.md`);
  writeFileSync(path, lines.join("\n"), "utf-8");
  console.log(`レポートを出力しました: ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
