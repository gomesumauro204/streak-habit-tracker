import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parse as parseYaml, parseDocument } from "yaml";
import { config } from "./config.js";

const EXAMPLE_SUFFIX = ".example.yaml";

export interface ManagedConfig {
  /** 例: "profile" (profile.example.yaml / profile.yaml のペアを指す) */
  name: string;
  exampleFile: string;
  targetFile: string;
}

/**
 * ルートディレクトリ直下の "*.example.yaml" をすべて検出し、対応する
 * "*.yaml" とのペアを返す。特定のファイル名には一切依存しないため、
 * 新しい設定ファイルを追加したい場合は "foo.example.yaml" を置くだけでよい。
 */
export function findManagedConfigs(rootDir: string = config.rootDir): ManagedConfig[] {
  return readdirSync(rootDir)
    .filter((f) => f.endsWith(EXAMPLE_SUFFIX))
    .map((f) => {
      const name = basename(f, EXAMPLE_SUFFIX);
      return {
        name,
        exampleFile: join(rootDir, f),
        targetFile: join(rootDir, `${name}.yaml`),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

type PlainObject = Record<string, unknown>;

function isPlainObject(v: unknown): v is PlainObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getByPath(obj: unknown, keys: string[]): unknown {
  let current = obj;
  for (const key of keys) {
    if (!isPlainObject(current)) return undefined;
    current = current[key];
  }
  return current;
}

/**
 * example にあって target に無いキーパスを再帰的に検出する。
 * 配列やスカラー値は「キーが存在する時点で既存」とみなし、中身までは比較しない
 * (要件⑥: 配列を勝手に重複追加・削除・並び替えしない)。
 */
export function findMissingPaths(example: unknown, target: unknown, prefix = ""): string[] {
  if (!isPlainObject(example)) return [];
  const targetObj = isPlainObject(target) ? target : {};
  const missing: string[] = [];

  for (const key of Object.keys(example)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!(key in targetObj)) {
      missing.push(path);
      continue;
    }
    const exVal = example[key];
    const targetVal = targetObj[key];
    if (isPlainObject(exVal) && isPlainObject(targetVal)) {
      missing.push(...findMissingPaths(exVal, targetVal, path));
    }
  }
  return missing;
}

function isPlaceholderValue(value: unknown): boolean {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return /例[:：]|○○|your-|xxxxx|ここに|placeholder/i.test(s);
}

export interface CheckResult {
  /** target ファイルがまだ存在しない場合 true */
  isNew: boolean;
  /** example にあって target に無いキーパス一覧 */
  missing: string[];
}

/** 差分を確認するだけで、一切ファイルを書き換えない */
export function checkConfig(cfg: ManagedConfig): CheckResult {
  if (!existsSync(cfg.targetFile)) {
    return { isNew: true, missing: [] };
  }
  const example = parseYaml(readFileSync(cfg.exampleFile, "utf-8"));
  const target = parseYaml(readFileSync(cfg.targetFile, "utf-8"));
  return { isNew: false, missing: findMissingPaths(example, target) };
}

export interface SyncReport {
  name: string;
  status: "created" | "updated" | "unchanged";
  added: string[];
  keptTopLevelKeys: string[];
  needsReview: string[];
  backupFile?: string;
}

/**
 * example と target を同期する。
 * - target が存在しない: example をそのままコピーして新規作成する(write時のみ)
 * - target が存在する: 不足しているキーパスだけを target に追記する。
 *   既存のキー・値・配列・コメントには一切触れない。
 *   write:false の場合は判定のみ行い、ファイルには書き込まない(config:check用)。
 */
export function syncConfig(cfg: ManagedConfig, { write }: { write: boolean }): SyncReport {
  if (!existsSync(cfg.targetFile)) {
    if (write) {
      copyFileSync(cfg.exampleFile, cfg.targetFile);
    }
    return { name: cfg.name, status: "created", added: [], keptTopLevelKeys: [], needsReview: [] };
  }

  const exampleText = readFileSync(cfg.exampleFile, "utf-8");
  const targetText = readFileSync(cfg.targetFile, "utf-8");
  const examplePlain = parseYaml(exampleText);
  const targetPlain = parseYaml(targetText);

  const missing = findMissingPaths(examplePlain, targetPlain);
  const keptTopLevelKeys = isPlainObject(targetPlain) ? Object.keys(targetPlain) : [];

  if (missing.length === 0) {
    return { name: cfg.name, status: "unchanged", added: [], keptTopLevelKeys, needsReview: [] };
  }

  const needsReview = missing.filter((path) =>
    isPlaceholderValue(getByPath(examplePlain, path.split(".")))
  );

  if (!write) {
    return { name: cfg.name, status: "updated", added: missing, keptTopLevelKeys, needsReview };
  }

  const backupFile = `${cfg.targetFile}.backup`;
  writeFileSync(backupFile, targetText, "utf-8");

  const exampleDoc = parseDocument(exampleText);
  const targetDoc = parseDocument(targetText);

  for (const path of missing) {
    const keys = path.split(".");
    // keepScalar=true: スカラー値でもNode(コメント付き)のまま取得し、コメントを保てる範囲で保つ
    const exNode = exampleDoc.getIn(keys, true);
    targetDoc.setIn(keys, exNode);
  }

  writeFileSync(cfg.targetFile, String(targetDoc), "utf-8");

  return { name: cfg.name, status: "updated", added: missing, keptTopLevelKeys, needsReview, backupFile };
}
