import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";
import type { JobDraft } from "./types.js";

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export function writeReport(drafts: JobDraft[]): string {
  const reportsDir = join(config.dataDir, "reports");
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const path = join(reportsDir, `${timestamp()}.md`);

  if (drafts.length === 0) {
    writeFileSync(path, `# 新着案件レポート (${timestamp()})\n\n新着案件はありませんでした。\n`, "utf-8");
    return path;
  }

  const sections = drafts.map(
    (d, i) => `## ${i + 1}. ${d.title}

- 検索条件: ${d.searchName}
- URL: ${d.url}
- 予算情報(抜粋): ${d.budgetText.slice(0, 200)}

### AIドラフト応募文(要確認・修正のうえ送信してください)

${d.draft}

---
`
  );

  const content = `# 新着案件レポート (${timestamp()})\n\n${drafts.length}件の新着案件が見つかりました。\n\n${sections.join("\n")}`;
  writeFileSync(path, content, "utf-8");
  return path;
}
