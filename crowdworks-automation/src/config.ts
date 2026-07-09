import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "dotenv/config";
import type { SearchConditionsFile } from "./types.js";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `環境変数 ${name} が設定されていません。.env.example を参考に .env を作成してください。`
    );
  }
  return value;
}

export const config = {
  cwEmail: requireEnv("CW_EMAIL"),
  cwPassword: requireEnv("CW_PASSWORD"),
  anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),
  headful: process.env.HEADFUL === "1",
  rootDir,
  dataDir: join(rootDir, "data"),
};

export function loadSearchConditions(): SearchConditionsFile {
  const path = join(rootDir, "search-conditions.json");
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as SearchConditionsFile;
  } catch {
    throw new Error(
      `search-conditions.json が見つかりません。search-conditions.example.json をコピーして ${path} を作成してください。`
    );
  }
}

export function loadApplicantTemplate(): string {
  const path = join(rootDir, "applicant-template.md");
  try {
    return readFileSync(path, "utf-8");
  } catch {
    throw new Error(
      `applicant-template.md が見つかりません。${path} に応募定型文の材料を書いてください。`
    );
  }
}
