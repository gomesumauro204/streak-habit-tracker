/**
 * 環境セットアップ確認スクリプト。
 *
 * 意図的に config.ts / configSync.ts を import しない。
 * config.ts は .env が未設定だと import 時点で例外を投げる設計になっており、
 * このスクリプトはまさに「.env が無い/不十分な状態」を検知するためのものなので、
 * それらに依存すると自己矛盾してしまう(既存の自動化ロジックには一切手を入れない)。
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const MIN_NODE_MAJOR = 18;
const EXAMPLE_SUFFIX = ".example.yaml";

type Status = "ok" | "warn" | "error";

interface CheckItem {
  status: Status;
  title: string;
  detail: string;
  fix?: string[];
}

const results: CheckItem[] = [];

function icon(status: Status): string {
  if (status === "ok") return "✅";
  if (status === "warn") return "⚠";
  return "❌";
}

function checkNodeVersion() {
  const major = Number(process.version.slice(1).split(".")[0]);
  if (Number.isNaN(major) || major < MIN_NODE_MAJOR) {
    results.push({
      status: "error",
      title: "Node.jsのバージョン",
      detail: `${process.version} が検出されましたが、v${MIN_NODE_MAJOR} 以上を推奨します。`,
      fix: [
        "brew upgrade node   # Homebrewでインストールしている場合",
        "または https://nodejs.org からLTS版をインストール",
      ],
    });
    return;
  }
  results.push({
    status: "ok",
    title: "Node.jsのバージョン",
    detail: `${process.version}(このスクリプトが実行できている時点でNode.js自体は導入済みです)`,
  });
}

function checkPnpm() {
  try {
    const version = execSync("pnpm --version", { encoding: "utf-8" }).trim();
    results.push({ status: "ok", title: "pnpm", detail: `pnpm ${version} が使用できます。` });
  } catch {
    results.push({
      status: "error",
      title: "pnpm",
      detail: "この環境から `pnpm` コマンドを実行できませんでした。",
      fix: [
        "corepack enable && corepack prepare pnpm@latest --activate   # Node.js同梱のcorepackが使える場合",
        "brew install pnpm   # Homebrewを使う場合",
        "インストール後は一度ターミナルを閉じて開き直すか、`source ~/.zprofile` を実行してください",
      ],
    });
  }
}

function checkPlaywrightChromium() {
  try {
    const execPath = chromium.executablePath();
    if (existsSync(execPath)) {
      results.push({ status: "ok", title: "Playwright Chromium", detail: `インストール済みです(${execPath})` });
    } else {
      results.push({
        status: "error",
        title: "Playwright Chromium",
        detail: "ブラウザ本体が見つかりませんでした。",
        fix: ["pnpm exec playwright install chromium"],
      });
    }
  } catch (err) {
    results.push({
      status: "error",
      title: "Playwright Chromium",
      detail: `確認中にエラーが発生しました: ${(err as Error).message}`,
      fix: ["pnpm install", "pnpm exec playwright install chromium"],
    });
  }
}

function checkEnvFile() {
  const envPath = join(rootDir, ".env");
  if (!existsSync(envPath)) {
    results.push({
      status: "error",
      title: ".env",
      detail: ".env が見つかりません。",
      fix: ["cp .env.example .env", "作成後、.env にログイン情報とAPIキーを入力してください"],
    });
    return;
  }

  const raw = readFileSync(envPath, "utf-8");
  const missingKeys = ["CW_EMAIL", "CW_PASSWORD", "ANTHROPIC_API_KEY"].filter((key) => {
    const match = raw.match(new RegExp(`^${key}=(.*)$`, "m"));
    const value = match?.[1]?.trim() ?? "";
    return value.length === 0 || /your-|xxxxx/i.test(value);
  });

  if (missingKeys.length > 0) {
    results.push({
      status: "warn",
      title: ".env",
      detail: `未設定または仮の値のままの項目があります: ${missingKeys.join(", ")}(値はログに表示しません)`,
      fix: [".env を開いて該当項目を入力してください"],
    });
    return;
  }

  results.push({ status: "ok", title: ".env", detail: "必要な項目が設定されています(値は表示しません)。" });
}

/** *.example.yaml を検出し、対応する *.yaml が存在するかだけを確認する(存在チェックのみ、内容の妥当性はconfig:checkが担当) */
function checkConfigFiles() {
  const exampleFiles = readdirSync(rootDir).filter((f) => f.endsWith(EXAMPLE_SUFFIX));
  if (exampleFiles.length === 0) {
    results.push({ status: "warn", title: "設定ファイル(*.example.yaml)", detail: "*.example.yaml が見つかりませんでした。" });
    return;
  }

  const missing = exampleFiles
    .map((f) => f.slice(0, -EXAMPLE_SUFFIX.length))
    .filter((name) => !existsSync(join(rootDir, `${name}.yaml`)));

  if (missing.length > 0) {
    results.push({
      status: "warn",
      title: "設定ファイル(*.yaml)",
      detail: `未作成のファイルがあります: ${missing.map((n) => `${n}.yaml`).join(", ")}`,
      fix: ["pnpm run config:update"],
    });
    return;
  }

  results.push({
    status: "ok",
    title: "設定ファイル(*.yaml)",
    detail: `${exampleFiles.length}件すべて存在します(内容の妥当性は pnpm run config:check で確認できます)。`,
  });
}

function printReport() {
  console.log("========================");
  console.log("環境セットアップ確認");
  console.log("========================");
  console.log("");

  for (const item of results) {
    console.log(`${icon(item.status)} ${item.title}`);
    console.log(`   ${item.detail}`);
    if (item.fix) {
      console.log("   対応コマンド:");
      for (const line of item.fix) console.log(`     ${line}`);
    }
    console.log("");
  }

  const hasError = results.some((r) => r.status === "error");
  const hasWarn = results.some((r) => r.status === "warn");

  console.log("========================");
  if (hasError) {
    console.log("❌ 未解決の問題があります。上記の対応コマンドを実行してから再度 `pnpm run setup` を実行してください。");
  } else if (hasWarn) {
    console.log("⚠ 動作はしますが、確認しておいた方がよい項目があります。");
  } else {
    console.log("✅ すべての項目が正常です。`pnpm run run:test` で動作確認できます。");
  }
  console.log("========================");

  process.exitCode = hasError ? 1 : 0;
}

checkNodeVersion();
checkPnpm();
checkPlaywrightChromium();
checkEnvFile();
checkConfigFiles();
printReport();
