import Anthropic from "@anthropic-ai/sdk";
import { config, loadJobCriteria } from "./config.js";
import type { JobClassification, JobMetadata, JobWithDetail, ScreeningResult, TokenUsage } from "./types.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const VALID_CLASSIFICATIONS: JobClassification[] = ["priority", "candidate", "review", "excluded"];

/** モデル出力からJSON部分だけを取り出す(コードフェンス等が付いても壊れないように) */
function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

function normalizeMetadata(raw: unknown): JobMetadata {
  if (typeof raw !== "object" || raw === null) return {};
  const m = raw as Record<string, unknown>;
  const asString = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim().length > 0 && v !== "不明" ? v.trim() : undefined;
  return {
    clientName: asString(m.clientName),
    budgetOrRate: asString(m.budgetOrRate),
    deadline: asString(m.deadline),
    requiredConditions: asString(m.requiredConditions),
    welcomeConditions: asString(m.welcomeConditions),
    expectedHours: asString(m.expectedHours),
    deliveryDate: asString(m.deliveryDate),
    applicationInstructions: asString(m.applicationInstructions),
    applicationQuestions: Array.isArray(m.applicationQuestions)
      ? m.applicationQuestions.filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      : undefined,
    hasAttachments: typeof m.hasAttachments === "boolean" ? m.hasAttachments : undefined,
  };
}

/**
 * 案件の本文まで読んだ上で、応募対象として妥当かをClaudeに判定させ、
 * 同時にクライアント名・報酬・募集期限などの構造化情報も本文から抽出する。
 * job-criteria.yaml の acceptKeywords/rejectKeywords はあくまで「参考情報」として渡し、
 * 最終判断はタイトル・本文の内容にもとづいて行わせる(キーワードの機械的な一致だけで
 * 判定しないのがポイント)。
 */
export interface ScreenJobOutcome {
  result: ScreeningResult;
  usage: TokenUsage;
}

export async function screenJob(job: JobWithDetail): Promise<ScreenJobOutcome> {
  const criteria = loadJobCriteria();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1200,
    // 単純な分類・抽出タスクのため思考は不要。Sonnet 5はthinking省略時に
    // adaptive thinkingが暗黙で有効になりmax_tokens予算を消費するため、明示的に無効化する。
    thinking: { type: "disabled" },
    system:
      "あなたはフリーランス案件の応募可否を判定するアシスタントです。" +
      "案件のタイトル・案件情報・本文を読み、実際にどんな作業を依頼されているのかを理解した上で判定してください。" +
      "「歓迎したい特徴」「避けたい特徴」はあくまで参考情報であり、キーワードの機械的な一致だけで判定してはいけません。" +
      "タイトルにキーワードが含まれていても内容が伴わなければ除外し、" +
      "逆にキーワードが含まれていなくても内容(開発・業務効率化・自動化を伴う実務)が合致していれば採用してください。" +
      "『データ入力を自動化するツール開発』のように、表面上はデータ入力に見えても実際は開発案件のものを誤って除外しないよう注意してください。" +
      "判定は次の4段階のいずれかに分類してください: " +
      '"priority"(強くおすすめできる優先応募候補) / "candidate"(応募候補になり得る) / ' +
      '"review"(判断材料が不足していて人間の確認が必要) / "excluded"(明確に対象外)。' +
      "分類にあたっては、応募者プロフィールとの適合度(必須経験・実務年数が現状とかけ離れていないか、" +
      "想定稼働時間が週10時間程度の範囲で対応可能か、報酬と作業量のバランス)も考慮してください。" +
      "あわせて、本文に明記されている範囲でクライアント名・報酬または時給・募集期限・必須条件・歓迎条件・" +
      "想定稼働時間・納期・応募時の指定事項・応募時の質問項目(箇条書きがあれば配列で)・添付ファイルの有無を抽出してください。" +
      "本文に記載が無い項目は無理に埋めず、省略するか \"不明\" としてください。" +
      "回答は必ず次のJSON形式のみとし、前後に説明文を付けないでください: " +
      '{"classification": "priority|candidate|review|excluded", "reason": "40〜80文字程度の判定理由", ' +
      '"metadata": {"clientName": "...", "budgetOrRate": "...", "deadline": "...", "requiredConditions": "...", ' +
      '"welcomeConditions": "...", "expectedHours": "...", "deliveryDate": "...", "applicationInstructions": "...", ' +
      '"applicationQuestions": ["...", "..."], "hasAttachments": true}}',
    messages: [
      {
        role: "user",
        content: `# 歓迎したい案件の特徴(参考。これに一致しなくても内容次第で採用可)\n${criteria.acceptKeywords.join(", ") || "(未設定)"}\n\n# 避けたい案件の特徴(参考。これに一致しても内容次第で採用可)\n${criteria.rejectKeywords.join(", ") || "(未設定)"}\n${criteria.description ? `\n# 判定方針の補足\n${criteria.description}\n` : ""}\n# 判定対象の案件\nタイトル: ${job.title}\n案件情報(抜粋): ${job.contextText.slice(0, 300)}\n\n本文:\n${job.description}\n\n上記の案件について、分類・判定理由・構造化情報をJSONで出力してください。`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
  const usage: TokenUsage = {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };

  try {
    const parsed = JSON.parse(extractJson(text)) as {
      classification?: unknown;
      reason?: unknown;
      metadata?: unknown;
    };
    const classification = VALID_CLASSIFICATIONS.includes(parsed.classification as JobClassification)
      ? (parsed.classification as JobClassification)
      : "review";
    return {
      result: {
        classification,
        reason: typeof parsed.reason === "string" ? parsed.reason : "(理由の取得に失敗)",
        metadata: normalizeMetadata(parsed.metadata),
      },
      usage,
    };
  } catch {
    // 判定結果を解析できない場合は、誤って自動で見落とさないよう「要確認」に倒す
    return {
      result: {
        classification: "review",
        reason: `判定結果の解析に失敗したため要確認としました: ${text.slice(0, 80)}`,
        metadata: {},
      },
      usage,
    };
  }
}
