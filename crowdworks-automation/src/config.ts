import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "dotenv/config";
import { load as loadYaml } from "js-yaml";
import type { JobCriteria, Profile, SearchCondition, SearchConditionsFile } from "./types.js";

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

function readYamlFile(filename: string, exampleFilename: string): unknown {
  const path = join(rootDir, filename);
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    throw new Error(`${filename} が見つかりません。${exampleFilename} をコピーして ${path} を作成してください。`);
  }

  try {
    return loadYaml(raw);
  } catch (err) {
    throw new Error(
      `${path} のYAML構文にエラーがあります。インデントや ":" の位置を見直してください。\n詳細: ${(err as Error).message}`
    );
  }
}

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
    const label = `searches[${i}]${entry.name ? `(${entry.name})` : ""}`;

    if (!entry.name || typeof entry.name !== "string") {
      throw new Error(`${path} の searches[${i}] に "name"(文字列)がありません。`);
    }
    if (!entry.searchUrl || typeof entry.searchUrl !== "string") {
      throw new Error(`${path} の ${label} に "searchUrl"(文字列)がありません。`);
    }
    if (
      entry.contractType !== undefined &&
      entry.contractType !== "fixed" &&
      entry.contractType !== "hourly"
    ) {
      throw new Error(
        `${path} の ${label} の "contractType" は "fixed" か "hourly" にしてください。`
      );
    }
    if (entry.minBudget !== undefined && typeof entry.minBudget !== "number") {
      throw new Error(`${path} の ${label} の "minBudget" は数値にしてください。`);
    }
    if (entry.minHourlyRate !== undefined && typeof entry.minHourlyRate !== "number") {
      throw new Error(`${path} の ${label} の "minHourlyRate" は数値にしてください。`);
    }
    if (entry.contractType === "hourly" && entry.minBudget !== undefined) {
      throw new Error(
        `${path} の ${label} は contractType: hourly なので "minBudget" ではなく "minHourlyRate" を使ってください。`
      );
    }
    if ((entry.contractType ?? "fixed") === "fixed" && entry.minHourlyRate !== undefined) {
      throw new Error(
        `${path} の ${label} は contractType: fixed(または省略)なので "minHourlyRate" ではなく "minBudget" を使ってください。`
      );
    }
    if (
      entry.excludeKeywords !== undefined &&
      (!Array.isArray(entry.excludeKeywords) ||
        entry.excludeKeywords.some((k) => typeof k !== "string"))
    ) {
      throw new Error(`${path} の ${label} の "excludeKeywords" は文字列のリストにしてください。`);
    }
    if (entry.newOnly !== undefined && typeof entry.newOnly !== "boolean") {
      throw new Error(`${path} の ${label} の "newOnly" は true/false にしてください。`);
    }
    if (entry.openOnly !== undefined && typeof entry.openOnly !== "boolean") {
      throw new Error(`${path} の ${label} の "openOnly" は true/false にしてください。`);
    }
  });
  return data as SearchConditionsFile;
}

export function loadSearchConditions(): SearchConditionsFile {
  const filename = "search-conditions.yaml";
  const data = readYamlFile(filename, "search-conditions.example.yaml");
  return validateSearchConditions(data, join(rootDir, filename));
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
  const filename = "profile.yaml";
  const data = readYamlFile(filename, "profile.example.yaml");
  return validateProfile(data, join(rootDir, filename));
}

function validateJobCriteria(data: unknown, path: string): JobCriteria {
  if (typeof data !== "object" || data === null) {
    throw new Error(`${path} の形式が不正です。`);
  }
  const c = data as Partial<JobCriteria>;
  if (
    !Array.isArray(c.acceptKeywords) ||
    c.acceptKeywords.some((k) => typeof k !== "string")
  ) {
    throw new Error(`${path} の "acceptKeywords" は文字列のリストにしてください(空リスト可)。`);
  }
  if (
    !Array.isArray(c.rejectKeywords) ||
    c.rejectKeywords.some((k) => typeof k !== "string")
  ) {
    throw new Error(`${path} の "rejectKeywords" は文字列のリストにしてください(空リスト可)。`);
  }
  if (c.description !== undefined && typeof c.description !== "string") {
    throw new Error(`${path} の "description" は文字列にしてください。`);
  }
  return data as JobCriteria;
}

export function loadJobCriteria(): JobCriteria {
  const filename = "job-criteria.yaml";
  const data = readYamlFile(filename, "job-criteria.example.yaml");
  return validateJobCriteria(data, join(rootDir, filename));
}
