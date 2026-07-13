import Anthropic from "@anthropic-ai/sdk";
import { config, loadProfile } from "./config.js";
import type { JobWithDetail, Profile } from "./types.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

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

export async function generateDraft(job: JobWithDetail): Promise<string> {
  const profile = loadProfile();
  const profileText = renderProfile(profile);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system:
      "あなたはフリーランスの案件応募文を作成するアシスタントです。" +
      "与えられた「応募者プロフィール」の名前・強み・ポートフォリオ・稼働条件などの" +
      "必須要素は必ず盛り込みつつ、案件内容に合わせて自己アピール部分をカスタマイズしてください。" +
      "応募文の最後は必ずプロフィールの名前で署名してください。" +
      "案件文中に応募時の指定フォーマット(記入項目など)があれば、それに従った構成にしてください。" +
      "誇張や虚偽は書かないこと。日本語の丁寧な文体で、簡潔にまとめてください。",
    messages: [
      {
        role: "user",
        content: `# 応募者プロフィール\n${profileText}\n\n# 案件情報\nタイトル: ${job.title}\nURL: ${job.url}\n\n本文:\n${job.description}\n\n上記の案件に対する応募文を作成してください。`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}
