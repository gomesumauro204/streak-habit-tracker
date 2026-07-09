import Anthropic from "@anthropic-ai/sdk";
import { config, loadApplicantTemplate } from "./config.js";
import type { JobWithDetail } from "./types.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

export async function generateDraft(job: JobWithDetail): Promise<string> {
  const template = loadApplicantTemplate();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system:
      "あなたはフリーランスの案件応募文を作成するアシスタントです。" +
      "与えられた「応募定型文の材料」に書かれた強み・ポートフォリオ・稼働条件などの" +
      "必須要素は必ず盛り込みつつ、案件内容に合わせて自己アピール部分をカスタマイズしてください。" +
      "案件文中に応募時の指定フォーマット(記入項目など)があれば、それに従った構成にしてください。" +
      "誇張や虚偽は書かないこと。日本語の丁寧な文体で、簡潔にまとめてください。",
    messages: [
      {
        role: "user",
        content: `# 応募定型文の材料\n${template}\n\n# 案件情報\nタイトル: ${job.title}\nURL: ${job.url}\n\n本文:\n${job.description}\n\n上記の案件に対する応募文を作成してください。`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
