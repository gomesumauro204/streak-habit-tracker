import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";
import type { JobDraft, JobMetadata, ScreenedJob, TokenUsage } from "./types.js";

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export interface SearchRunStat {
  name: string;
  searchUrl: string;
  rawJobCount: number;
  excludedNonJobLinkCount: number;
}

export interface RunMeta {
  usedSavedSession: boolean;
  twoFactorRequired: boolean;
  searches: SearchRunStat[];
  totalBeforeDedup: number;
  totalAfterDedup: number;
  errors: string[];
  draftSuccessCount: number;
  draftFailCount: number;
  draftUsageTotal: TokenUsage;
  draftCostUsd: number;
}

export interface ReportInput {
  meta: RunMeta;
  priority: (ScreenedJob | JobDraft)[];
  candidate: (ScreenedJob | JobDraft)[];
  review: ScreenedJob[];
  excluded: ScreenedJob[];
}

function isJobDraft(job: ScreenedJob | JobDraft): job is JobDraft {
  return "draftResult" in job;
}

function renderMetadataLines(metadata: JobMetadata): string[] {
  const lines: string[] = [];
  lines.push(`  - クライアント名: ${metadata.clientName ?? "不明"}`);
  lines.push(`  - 契約方式・報酬/時給: ${metadata.budgetOrRate ?? "不明"}`);
  lines.push(`  - 募集期限: ${metadata.deadline ?? "不明"}`);
  lines.push(`  - 必須条件: ${metadata.requiredConditions ?? "不明"}`);
  lines.push(`  - 歓迎条件: ${metadata.welcomeConditions ?? "不明"}`);
  lines.push(`  - 想定稼働時間: ${metadata.expectedHours ?? "不明"}`);
  lines.push(`  - 納期: ${metadata.deliveryDate ?? "不明"}`);
  lines.push(`  - 応募時の指定事項: ${metadata.applicationInstructions ?? "不明"}`);
  lines.push(
    `  - 応募時の質問項目: ${
      metadata.applicationQuestions && metadata.applicationQuestions.length > 0
        ? metadata.applicationQuestions.map((q, i) => `\n    ${i + 1}. ${q}`).join("")
        : "不明"
    }`
  );
  lines.push(`  - 添付ファイル: ${metadata.hasAttachments ? "あり" : metadata.hasAttachments === false ? "なし" : "不明"}`);
  return lines;
}

function renderJobSection(job: ScreenedJob | JobDraft, index: number): string {
  const lines: string[] = [];
  lines.push(`### ${index + 1}. ${job.title}`);
  lines.push("");
  lines.push(`- URL: ${job.url}`);
  lines.push(`- 検索条件: ${job.searchName}`);
  lines.push(`- 判定理由: ${job.screening.reason}`);
  lines.push("- 案件情報:");
  lines.push(...renderMetadataLines(job.screening.metadata));

  if (isJobDraft(job)) {
    const d = job.draftResult;
    lines.push("");
    lines.push("#### AIドラフト応募文(要確認・修正のうえ送信してください)");
    lines.push("");
    lines.push(d.draft);
    lines.push("");
    lines.push(`- この案件を応募候補にした理由: ${d.candidacyReason || "(記載なし)"}`);
    lines.push(`- 懸念点: ${d.concerns || "(記載なし)"}`);
    lines.push(
      `- 応募前に確認した方がよい質問: ${
        d.questionsToConfirm.length > 0 ? d.questionsToConfirm.map((q) => `\n  - ${q}`).join("") : "(記載なし)"
      }`
    );
    lines.push(`- 提案する契約金額/時間単価の考え方: ${d.suggestedRate || "(記載なし)"}`);
  }

  lines.push("", "---", "");
  return lines.join("\n");
}

export function writeReport(input: ReportInput): string {
  const reportsDir = join(config.dataDir, "reports");
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const path = join(reportsDir, `${timestamp()}.md`);
  const { meta, priority, candidate, review, excluded } = input;

  const lines: string[] = [];
  lines.push(`# 案件取得・判定レポート (${timestamp()})`);
  lines.push("");
  lines.push("**このレポートはテスト/確認用です。応募の送信は行っていません。**");
  lines.push("");

  lines.push("## 実行サマリー");
  lines.push(`- ログイン結果: 成功`);
  lines.push(`- 保存済みセッションを使用したか: ${meta.usedSavedSession ? "はい" : "いいえ(新規ログイン)"}`);
  lines.push(`- 認証コード入力が必要だったか: ${meta.twoFactorRequired ? "はい" : "いいえ"}`);
  lines.push("- 使用した検索条件:");
  for (const s of meta.searches) {
    lines.push(`  - **${s.name}**`);
    lines.push(`    - searchUrl: ${s.searchUrl}`);
    lines.push(`    - 取得件数(案件詳細ページのみ): ${s.rawJobCount}件`);
    lines.push(`    - カテゴリ/検索結果一覧等として除外した件数: ${s.excludedNonJobLinkCount}件`);
  }
  lines.push(`- 重複除外前の合計件数: ${meta.totalBeforeDedup}件`);
  lines.push(`- 重複除外後の件数: ${meta.totalAfterDedup}件`);
  const totalScreened = priority.length + candidate.length + review.length + excluded.length;
  lines.push(`- AI判定した件数: ${totalScreened}件`);
  lines.push(`- 優先応募候補: ${priority.length}件`);
  lines.push(`- 応募候補: ${candidate.length}件`);
  lines.push(`- 要確認: ${review.length}件`);
  lines.push(`- 除外: ${excluded.length}件`);
  const draftedCount = [...priority, ...candidate].filter(isJobDraft).length;
  lines.push(`- 応募文を生成した件数: ${draftedCount}件`);
  lines.push(`- 応募文生成 成功/失敗: ${meta.draftSuccessCount}件 / ${meta.draftFailCount}件`);
  lines.push(
    `- 応募文生成の使用トークン: 入力${meta.draftUsageTotal.inputTokens.toLocaleString()} / 出力${meta.draftUsageTotal.outputTokens.toLocaleString()}(概算 $${meta.draftCostUsd.toFixed(4)})`
  );
  lines.push(`- 応募送信: 行っていません(このツールに送信機能はありません)`);
  if (meta.errors.length > 0) {
    lines.push("- エラー:");
    for (const e of meta.errors) lines.push(`  - ${e}`);
  } else {
    lines.push("- エラー: なし");
  }
  lines.push("");

  lines.push("## 優先応募候補");
  lines.push("");
  if (priority.length === 0) {
    lines.push("(該当する案件はありませんでした)");
    lines.push("");
  } else {
    priority.forEach((job, i) => lines.push(renderJobSection(job, i)));
  }

  lines.push("## 応募候補");
  lines.push("");
  if (candidate.length === 0) {
    lines.push("(該当する案件はありませんでした)");
    lines.push("");
  } else {
    candidate.forEach((job, i) => lines.push(renderJobSection(job, i)));
  }

  lines.push("## 要確認");
  lines.push("");
  if (review.length === 0) {
    lines.push("(該当する案件はありませんでした)");
    lines.push("");
  } else {
    for (const job of review) {
      lines.push(`- [${job.title}](${job.url}) — ${job.screening.reason}`);
    }
    lines.push("");
  }

  lines.push(`## 除外した案件(${excluded.length}件)`);
  lines.push("");
  if (excluded.length === 0) {
    lines.push("(該当する案件はありませんでした)");
  } else {
    for (const job of excluded) {
      lines.push(`- [${job.title}](${job.url}) — ${job.screening.reason}`);
    }
  }
  lines.push("");
  lines.push(
    "※ 誤って除外/要確認になっていそうな案件があれば job-criteria.yaml のキーワード・補足説明を調整してください。"
  );

  const content = lines.join("\n");
  writeFileSync(path, content, "utf-8");
  return path;
}
