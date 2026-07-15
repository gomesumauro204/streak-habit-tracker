/**
 * 「応募文生成のみ再テスト」専用スクリプト。
 *
 * 今回の目的: 既に取得・AI判定済みの候補案件データ(data/reports/2026-07-16_0637.md)を
 * 再利用し、新たな案件検索・AI判定は一切行わずに、応募文生成のロジックだけを
 * 修正後の実装で再テストする。
 *
 * 案件情報は上記レポートに記載されていた内容をそのまま転記したもの
 * (クライアント名・報酬・条件・応募時の質問項目など、レポートのAI判定結果を再利用)。
 * 本文全文(description)は保存されていないため使用しない — 応募文生成は
 * タイトル・URL・抽出済みメタデータのみを入力として行う(今回の改善点でもある)。
 */
import { generateDraft } from "./draftGenerator.js";
import { estimateCostUsd, sumUsage } from "./pricing.js";
import { config } from "./config.js";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { JobMetadata, JobRef, TokenUsage } from "./types.js";

interface Candidate {
  job: JobRef;
  classification: "優先応募候補" | "応募候補";
  reason: string;
  metadata: JobMetadata;
}

const SOURCE_REPORT = "data/reports/2026-07-16_0637.md";

const candidates: Candidate[] = [
  {
    job: {
      title: "Power Automate / Copilot Studio 構築エンジニア",
      url: "https://crowdworks.jp/public/jobs/13279986",
      searchName: "エンジニア(時間単価)",
    },
    classification: "優先応募候補",
    reason:
      "Power Automate/Copilot Studioによる業務自動化・チャットボット構築の実装案件で、週10時間程度の稼働にも合致",
    metadata: {
      clientName: "GrowthCommit",
      budgetOrRate: "時間単価3,000〜4,000円(記載は3,500円/時、税込・システム手数料込み)",
      deadline: "2026年07月17日",
      requiredConditions: "エンジニア実務経験2年以上、新技術の自走キャッチアップ力、チャットでの進捗共有ができること",
      welcomeConditions:
        "Power Automateクラウドフロー構築経験、Copilot Studioエージェント構築経験、Microsoft365利用・管理経験、Power Apps/Power Platform知見、企業向け導入・運用支援経験",
      expectedHours: "週5〜10時間程度",
      applicationInstructions:
        "応募時に経歴・経験概要、Power Automate/Copilot Studio経験有無・レベル感、月あたりの可能稼働時間、簡単な自己紹介を記載",
      applicationQuestions: [
        "エンジニアとしての経歴・実務経験の概要",
        "Power Automate / Copilot Studio の経験有無・レベル感（未経験でも可）",
        "月あたりの可能稼働時間",
        "簡単な自己紹介",
      ],
      hasAttachments: false,
    },
  },
  {
    job: {
      title: "【継続案件】API連携×データロジック修正エンジニア募集｜生成AI活用前提",
      url: "https://crowdworks.jp/public/jobs/13301283",
      searchName: "エンジニア(固定報酬)",
    },
    classification: "応募候補",
    reason:
      "API連携・データロジック修正の実装案件で生成AI活用前提。開発経験必須で工数10-25hはやや稼働多いが単発継続可",
    metadata: {
      clientName: "zjuxha9a",
      budgetOrRate: "30,000円〜50,000円(タスク単位、目安時給約2,000円)",
      deadline: "2026年07月26日",
      requiredConditions:
        "API連携を含む開発経験、既存コード理解・修正能力、生成AI(ChatGPT/Claude等)を活用した開発経験、動画・仕様を最後まで確認できること",
      welcomeConditions: "Amazon SP-APIまたはAds APIの知識、データ処理・数値ロジック実装経験、React/Next.js/Node.jsの経験",
      expectedHours: "1タスクあたり10〜25時間程度",
      applicationInstructions: "開発実績・得意領域、活用している生成AIの種類と活用方法、想定工数と見積金額、想定納期を記載して応募",
      applicationQuestions: [
        "開発実績、得意領域(フロント/バック/API/インフラ)",
        "活用している生成AIの種類と開発にどのように活かすか",
        "本タスクの想定工数と見積金額",
        "想定納期(目標)",
      ],
      hasAttachments: false,
    },
  },
  {
    job: {
      title: "【急募・継続依頼あり】Claude Code開発エンジニア",
      url: "https://crowdworks.jp/public/jobs/13288723",
      searchName: "エンジニア(時間単価)",
    },
    classification: "応募候補",
    reason: "Claude Codeを用いた社内DXツール開発で実装案件だが時給がやや低く稼働は柔軟",
    metadata: {
      clientName: "株式会社アイプレット",
      budgetOrRate: "時間単価3,000円〜4,000円(経験・スキルにより相談)",
      deadline: "2026年07月20日",
      requiredConditions:
        "AIコーディングエージェント(Claude Code等)を活用したシステム開発経験、中小企業向け基幹システム・社内DXツール開発経験、エンジニア実務経験3年以上、非エンジニアと要件を詰めながら1人で開発を完遂できる自走力",
      welcomeConditions:
        "データ分析系開発の経験、事業内容理解に基づく開発要件への落とし込み、BtoB/クライアントワーク経験、平日日中のオンラインMTG(週1〜2回)対応可能",
      expectedHours: "10時間/週",
      deliveryDate: "1週間〜1ヶ月",
      applicationInstructions:
        "AIコーディングエージェントを活用した開発実績(2〜3件、概要と担当範囲)、エンジニア経験年数・主な技術スタック、週あたり稼働可能時間・平日日中MTG可否、稼働開始可能日を記載",
      applicationQuestions: [
        "AIコーディングエージェントを活用した開発実績(2〜3件、概要と担当範囲)",
        "エンジニアとしての経験年数・主な技術スタック",
        "週あたりの稼働可能時間・平日日中のMTG可否",
        "稼働開始可能日",
      ],
      hasAttachments: false,
    },
  },
];

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

async function main() {
  console.log(`[再テスト] 検索・AI判定は実行しません。既存データを再利用します(出典: ${SOURCE_REPORT})`);
  console.log(`[再テスト] 対象案件数: ${candidates.length}件`);
  console.log("");

  const usages: TokenUsage[] = [];
  let successCount = 0;
  let failCount = 0;
  const reportLines: string[] = [];

  reportLines.push(`# 応募文生成 再テストレポート (${timestamp()})`);
  reportLines.push("");
  reportLines.push(`**このレポートはテスト用です。応募の送信は行っていません。**`);
  reportLines.push(`案件データの出典: ${SOURCE_REPORT}(新規の案件検索・AI判定は行っていません)`);
  reportLines.push("");

  for (const c of candidates) {
    console.log(`--- ${c.classification}: ${c.job.title} ---`);
    const outcome = await generateDraft(c.job, c.metadata);
    usages.push(...outcome.usages);

    const usageText = outcome.usages
      .map((u, i) => `試行${i + 1}: 入力${u.inputTokens} / 出力${u.outputTokens}`)
      .join(", ");
    console.log(`  試行回数: ${outcome.attempts} / ${usageText}`);

    reportLines.push(`## ${c.classification}: ${c.job.title}`);
    reportLines.push("");
    reportLines.push(`- URL: ${c.job.url}`);
    reportLines.push(`- 検索条件: ${c.job.searchName}`);
    reportLines.push(`- 判定理由(既存データ): ${c.reason}`);
    reportLines.push(`- 試行回数: ${outcome.attempts}`);
    reportLines.push(`- トークン使用量: ${usageText}`);

    if (outcome.success && outcome.result) {
      successCount++;
      console.log(`  → 成功`);
      const d = outcome.result;
      reportLines.push("");
      reportLines.push("### 応募文");
      reportLines.push("");
      reportLines.push(d.draft);
      reportLines.push("");
      reportLines.push(`- この案件を応募候補にした理由: ${d.candidacyReason || "(記載なし)"}`);
      reportLines.push(`- 懸念点: ${d.concerns || "(記載なし)"}`);
      reportLines.push(
        `- 応募前に確認したい質問: ${
          d.questionsToConfirm.length > 0 ? d.questionsToConfirm.map((q) => `\n  - ${q}`).join("") : "(記載なし)"
        }`
      );
      reportLines.push(`- 提案する契約金額/時間単価の考え方: ${d.suggestedRate || "(記載なし)"}`);
    } else {
      failCount++;
      console.log(`  → 失敗: ${outcome.failureReason}`);
      reportLines.push(`- 結果: **応募文生成失敗**`);
      reportLines.push(`- 失敗理由: ${outcome.failureReason}`);
    }
    reportLines.push("");
    reportLines.push("---");
    reportLines.push("");
  }

  const total = sumUsage(usages);
  const cost = estimateCostUsd(total);

  console.log("");
  console.log("=== まとめ ===");
  console.log(`成功: ${successCount}件 / 失敗: ${failCount}件`);
  console.log(`合計トークン: 入力${total.inputTokens} / 出力${total.outputTokens}`);
  console.log(`概算コスト: $${cost.toFixed(4)}(Claude Sonnet 5 導入価格 入力$2/出力$10 per MTok)`);
  console.log("応募送信は行っていません。");

  reportLines.push("## まとめ");
  reportLines.push("");
  reportLines.push(`- 再利用した候補案件数: ${candidates.length}件`);
  reportLines.push("- 新たに案件検索を実行: していません");
  reportLines.push("- 新たにAI判定(採用/除外)を実行: していません");
  reportLines.push(`- 応募文生成 成功/失敗: ${successCount}件 / ${failCount}件`);
  reportLines.push(`- 合計トークン: 入力${total.inputTokens} / 出力${total.outputTokens}`);
  reportLines.push(`- 概算コスト: $${cost.toFixed(4)}`);
  reportLines.push("- 応募送信: 行っていません");

  const reportsDir = join(config.dataDir, "reports");
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
  const path = join(reportsDir, `${timestamp()}-redraft.md`);
  writeFileSync(path, reportLines.join("\n"), "utf-8");
  console.log(`レポートを出力しました: ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
