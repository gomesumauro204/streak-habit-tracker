import Anthropic from "@anthropic-ai/sdk";
import { config, loadProfile } from "./config.js";
import type {
  DraftGenerationOutcome,
  DraftResult,
  JobMetadata,
  JobRef,
  Profile,
  TokenUsage,
} from "./types.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const NORMAL_MAX_TOKENS = 1600;
const SHORT_RETRY_MAX_TOKENS = 900;

function renderProfile(profile: Profile): string {
  const lines: string[] = [];
  lines.push(`名前: ${profile.name}`);
  if (profile.title) lines.push(`肩書き: ${profile.title}`);

  lines.push("", "強み・実績:");
  for (const s of profile.strengths) lines.push(`- ${s}`);

  if (profile.portfolio?.url) {
    lines.push("", `ポートフォリオ: ${profile.portfolio.url}`);
    if (profile.portfolio.note) lines.push(profile.portfolio.note);
  }

  if (profile.availability?.hours || profile.availability?.scope) {
    lines.push("", "稼働条件:");
    if (profile.availability.hours) lines.push(`- 稼働時間: ${profile.availability.hours}`);
    if (profile.availability.scope) lines.push(`- 対応範囲: ${profile.availability.scope}`);
  }

  if (profile.extraNotes && profile.extraNotes.length > 0) {
    lines.push("", "その他アピール:");
    for (const n of profile.extraNotes) lines.push(`- ${n}`);
  }

  if (profile.sampleApplication) {
    lines.push("", "参考にしたい応募文サンプル(文体・構成の参考用):", profile.sampleApplication);
  }

  return lines.join("\n");
}

function renderMetadata(metadata: JobMetadata): string {
  const lines: string[] = [];
  if (metadata.clientName) lines.push(`クライアント名: ${metadata.clientName}`);
  if (metadata.budgetOrRate) lines.push(`報酬/時給: ${metadata.budgetOrRate}`);
  if (metadata.deadline) lines.push(`募集期限: ${metadata.deadline}`);
  if (metadata.requiredConditions) lines.push(`必須条件: ${metadata.requiredConditions}`);
  if (metadata.welcomeConditions) lines.push(`歓迎条件: ${metadata.welcomeConditions}`);
  if (metadata.expectedHours) lines.push(`想定稼働時間: ${metadata.expectedHours}`);
  if (metadata.deliveryDate) lines.push(`納期: ${metadata.deliveryDate}`);
  if (metadata.applicationInstructions) lines.push(`応募時の指定事項: ${metadata.applicationInstructions}`);
  if (metadata.applicationQuestions && metadata.applicationQuestions.length > 0) {
    lines.push("応募時の質問項目:");
    metadata.applicationQuestions.forEach((q, i) => lines.push(`  ${i + 1}. ${q}`));
  }
  if (metadata.hasAttachments) lines.push("添付ファイルあり");
  return lines.length > 0 ? lines.join("\n") : "(特筆すべき指定事項なし)";
}

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function buildSystemPrompt(short: boolean): string {
  const base =
    "あなたはフリーランスの案件応募文を作成するアシスタントです。" +
    "「応募者プロフィール」の名前・強み・ポートフォリオ・稼働条件を踏まえ、案件内容に合わせて応募文を作成してください。" +
    "応募文の最後は必ずプロフィールの名前で署名してください。" +
    "「応募時の指定事項」「応募時の質問項目」がある場合は、それに沿った見出し・回答順で構成し、質問には漏れなく回答してください。" +
    "共通テンプレートの貼り付けではなく、案件内容に合わせて冒頭を変えてください。不要な項目は追加しないこと。" +
    "『AIを活用して対応します』のような抽象表現は避け、業務内容・課題整理・要件定義・設計・開発・動作確認・改善という具体的な実務表現を使うこと。" +
    "実績は事実以上に誇張せず、未経験分野を経験済みのように書かないこと。案件に関係のない実績は書かないこと。" +
    "応募文は800〜1200文字程度を目安にしてください。同じ内容の繰り返しや長い一般論は書かないこと。" +
    "candidacyReason・concerns・suggestedRateは1〜2文で簡潔に。questionsToConfirmは最大3件まで。";

  const jsonSpec =
    '{"draft": "応募文本文", "candidacyReason": "この案件を応募候補にした理由(簡潔に)", ' +
    '"concerns": "懸念点(簡潔に)", "questionsToConfirm": ["応募前に確認したい質問(最大3件)"], ' +
    '"suggestedRate": "提案する契約金額または時間単価の考え方(簡潔に)"}';

  if (short) {
    return (
      base +
      " 前回の出力は長すぎて途中で切れました。今回は必ず全体をより簡潔にし、" +
      "応募文は600〜800文字程度、他の項目は1文のみにしてください。" +
      "回答は必ず次のJSON形式のみとし、前後に説明文を付けないでください: " +
      jsonSpec
    );
  }

  return base + " 回答は必ず次のJSON形式のみとし、前後に説明文を付けないでください: " + jsonSpec;
}

function parseDraftResult(text: string): DraftResult {
  const parsed = JSON.parse(extractJson(text)) as Partial<DraftResult>;
  if (typeof parsed.draft !== "string" || parsed.draft.trim().length === 0) {
    throw new Error("draftが空です");
  }
  return {
    draft: parsed.draft,
    candidacyReason: typeof parsed.candidacyReason === "string" ? parsed.candidacyReason : "",
    concerns: typeof parsed.concerns === "string" ? parsed.concerns : "",
    questionsToConfirm: Array.isArray(parsed.questionsToConfirm)
      ? parsed.questionsToConfirm.filter((q): q is string => typeof q === "string")
      : [],
    suggestedRate: typeof parsed.suggestedRate === "string" ? parsed.suggestedRate : "",
  };
}

async function callModel(
  job: JobRef,
  metadata: JobMetadata,
  profileText: string,
  short: boolean
): Promise<{ text: string; usage: TokenUsage; stopReason: string | null }> {
  const metadataText = renderMetadata(metadata);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: short ? SHORT_RETRY_MAX_TOKENS : NORMAL_MAX_TOKENS,
    // 単純なJSON生成タスクのため思考は不要。Sonnet 5はthinking省略時に
    // adaptive thinkingが暗黙で有効になりmax_tokens予算を消費するため、明示的に無効化する。
    thinking: { type: "disabled" },
    system: buildSystemPrompt(short),
    messages: [
      {
        role: "user",
        content: `# 応募者プロフィール\n${profileText}\n\n# 案件情報\nタイトル: ${job.title}\nURL: ${job.url}\n\n# 本文から抽出した指定事項・条件\n${metadataText}\n\n上記の案件に対する応募文と付随情報をJSONで出力してください。`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

  return {
    text,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
    stopReason: message.stop_reason,
  };
}

/**
 * 案件1件につき1回のAPI呼び出しで応募文と付随情報を生成する(他案件のデータは一切渡さない)。
 * JSON解析に失敗した場合は、その案件だけ1回だけ短い形式で再試行する。
 * stop_reason: "max_tokens" は残高切れではなく出力過多の合図として扱い、
 * 再試行時はより簡潔な出力を明示的に指示する。
 * 2回とも失敗した場合は、他案件の結果に影響を与えず、失敗として記録する。
 */
export async function generateDraft(job: JobRef, metadata: JobMetadata): Promise<DraftGenerationOutcome> {
  const profile = loadProfile();
  const profileText = renderProfile(profile);

  const usages: TokenUsage[] = [];
  let lastText = "";
  let lastStopReason: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const short = attempt === 2;
    const { text, usage, stopReason } = await callModel(job, metadata, profileText, short);
    usages.push(usage);
    lastText = text;
    lastStopReason = stopReason;

    try {
      const result = parseDraftResult(text);
      return { success: true, result, attempts: attempt, usages };
    } catch {
      if (attempt === 1) {
        console.warn(
          `  [応募文生成] 1回目のJSON解析に失敗(stop_reason=${stopReason})。短い形式で再試行します。`
        );
      }
    }
  }

  const reason =
    lastStopReason === "max_tokens"
      ? "2回試行しましたが、出力が長すぎてJSONが完成しませんでした(max_tokens)。"
      : `2回試行しましたがJSONの解析に失敗しました(最終stop_reason=${lastStopReason})。`;

  return {
    success: false,
    attempts: 2,
    usages,
    failureReason: `${reason} モデル出力(末尾): ${lastText.slice(-200)}`,
  };
}
