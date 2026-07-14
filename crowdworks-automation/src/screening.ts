import Anthropic from "@anthropic-ai/sdk";
import { config, loadJobCriteria } from "./config.js";
import type { JobWithDetail, ScreeningResult } from "./types.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

/** モデル出力からJSON部分だけを取り出す(コードフェンス等が付いても壊れないように) */
function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

/**
 * 案件の本文まで読んだ上で、応募対象として妥当かをClaudeに判定させる。
 * job-criteria.yaml の acceptKeywords/rejectKeywords はあくまで「参考情報」として渡し、
 * 最終判断はタイトル・本文の内容にもとづいて行わせる(キーワードの機械的な一致だけで
 * 判定しないのがポイント)。
 */
export async function screenJob(job: JobWithDetail): Promise<ScreeningResult> {
  const criteria = loadJobCriteria();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    system:
      "あなたはフリーランス案件の応募可否を判定するアシスタントです。" +
      "案件のタイトル・案件情報・本文を読み、実際にどんな作業を依頼されているのかを理解した上で判定してください。" +
      "「歓迎したい特徴」「避けたい特徴」はあくまで参考情報であり、キーワードの機械的な一致だけで判定してはいけません。" +
      "タイトルにキーワードが含まれていても内容が伴わなければ除外し、" +
      "逆にキーワードが含まれていなくても内容が合致していれば採用してください。" +
      "回答は必ず次のJSON形式のみとし、前後に説明文を付けないでください: " +
      '{"accepted": true または false, "reason": "40文字程度の判定理由"}',
    messages: [
      {
        role: "user",
        content: `# 歓迎したい案件の特徴(参考。これに一致しなくても内容次第で採用可)\n${criteria.acceptKeywords.join(", ") || "(未設定)"}\n\n# 避けたい案件の特徴(参考。これに一致しても内容次第で採用可)\n${criteria.rejectKeywords.join(", ") || "(未設定)"}\n${criteria.description ? `\n# 判定方針の補足\n${criteria.description}\n` : ""}\n# 判定対象の案件\nタイトル: ${job.title}\n案件情報(抜粋): ${job.contextText.slice(0, 300)}\n\n本文:\n${job.description}\n\n上記の案件が応募対象として妥当か判定してください。`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

  try {
    const parsed = JSON.parse(extractJson(text)) as Partial<ScreeningResult>;
    if (typeof parsed.accepted !== "boolean") {
      throw new Error("accepted が boolean ではありません");
    }
    return { accepted: parsed.accepted, reason: String(parsed.reason ?? "") };
  } catch {
    // 判定結果を解析できない場合は、誤って応募してしまわないよう安全側(除外)に倒す
    return { accepted: false, reason: `判定結果の解析に失敗したため除外: ${text.slice(0, 80)}` };
  }
}
