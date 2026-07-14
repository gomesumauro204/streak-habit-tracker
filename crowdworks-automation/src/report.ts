import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";
import type { JobDraft, ScreenedJob } from "./types.js";

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export function writeReport(drafts: JobDraft[], rejected: ScreenedJob[] = []): string {
  const reportsDir = join(config.dataDir, "reports");
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const path = join(reportsDir, `${timestamp()}.md`);
  const ts = timestamp();

  const acceptedSections = drafts.map(
    (d, i) => `## ${i + 1}. ${d.title}

- 検索条件: ${d.searchName}
- URL: ${d.url}
- 案件情報(抜粋): ${d.contextText.slice(0, 200)}

### AIドラフト応募文(要確認・修正のうえ送信してください)

${d.draft}

---
`
  );

  const rejectedSection =
    rejected.length > 0
      ? `## 除外した案件(${rejected.length}件、応募対象判定で不採用)\n\n` +
        rejected
          .map((r) => `- [${r.title}](${r.url}) — ${r.screening.reason}`)
          .join("\n") +
        "\n\n※ 誤って除外されていそうな案件があれば job-criteria.yaml のキーワード・補足説明を調整してください。\n"
      : "";

  if (drafts.length === 0) {
    const content = `# 新着案件レポート (${ts})\n\n応募対象となる新着案件はありませんでした。\n\n${rejectedSection}`;
    writeFileSync(path, content, "utf-8");
    return path;
  }

  const content = `# 新着案件レポート (${ts})\n\n応募対象: ${drafts.length}件 / 除外: ${rejected.length}件\n\n${acceptedSections.join("\n")}\n${rejectedSection}`;
  writeFileSync(path, content, "utf-8");
  return path;
}
