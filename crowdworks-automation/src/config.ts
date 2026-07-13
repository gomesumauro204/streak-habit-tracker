import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "dotenv/config";
import { load as loadYaml } from "js-yaml";
import type { Profile, SearchCondition, SearchConditionsFile } from "./types.js";

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

function validateSearchConditions(data: unknown, path: string): SearchConditionsFile {
  if (typeof data !== "object" || data === null || !("searches" in data)) {
    throw new Error(`${path} の形式が不正です。トップレベルに "searches:" のリストが必要です。`);
  }
  const searches = (data as { searches: unknown }).searches;
  if (!Array.isArray(searches) || searches.length === 0) {
    throw new Error(`${path} の "searches" は1件以上のリストにしてください。`);
  }
  searches.forEach((s, i) => {
    if (typeof s !== "object" || s === null) {
      throw new Error(`${path} の searches[${i}] がオブジェクトではありません。`);
    }
    const entry = s as Partial<SearchCondition>;
    if (!entry.name || typeof entry.name !== "string") {
      throw new Error(`${path} の searches[${i}] に "name"(文字列)がありません。`);
    }
    if (!entry.searchUrl || typeof entry.searchUrl !== "string") {
      throw new Error(`${path} の searches[${i}](${entry.name}) に "searchUrl"(文字列)がありません。`);
    }
    if (entry.minBudget !== undefined && typeof entry.minBudget !== "number") {
      throw new Error(`${path} の searches[${i}](${entry.name}) の "minBudget" は数値にしてください。`);
    }
  });
  return data as SearchConditionsFile;
}

export function loadSearchConditions(): SearchConditionsFile {
  const path = join(rootDir, "search-conditions.yaml");
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    throw new Error(
      `search-conditions.yaml が見つかりません。search-conditions.example.yaml をコピーして ${path} を作成してください。`
    );
  }

  let data: unknown;
  try {
    data = loadYaml(raw);
  } catch (err) {
    throw new Error(
      `${path} のYAML構文にエラーがあります。インデントや ":" の位置を見直してください。\n詳細: ${(err as Error).message}`
    );
  }

  return validateSearchConditions(data, path);
}

function validateProfile(data: unknown, path: string): Profile {
  if (typeof data !== "object" || data === null) {
    throw new Error(`${path} の形式が不正です。`);
  }
  const p = data as Partial<Profile>;
  if (!p.name || typeof p.name !== "string") {
    throw new Error(`${path} に "name"(文字列)がありません。`);
  }
  if (!Array.isArray(p.strengths) || p.strengths.length === 0) {
    throw new Error(`${path} の "strengths" は1件以上のリストにしてください。`);
  }
  return data as Profile;
}

export function loadProfile(): Profile {
  const path = join(rootDir, "profile.yaml");
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    throw new Error(
      `profile.yaml が見つかりません。profile.example.yaml をコピーして ${path} を作成してください。`
    );
  }

  let data: unknown;
  try {
    data = loadYaml(raw);
  } catch (err) {
    throw new Error(
      `${path} のYAML構文にエラーがあります。インデントや ":" の位置を見直してください。\n詳細: ${(err as Error).message}`
    );
  }

  return validateProfile(data, path);
}
