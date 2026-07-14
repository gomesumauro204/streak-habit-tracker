import { basename } from "node:path";
import { createInterface } from "node:readline/promises";
import { findManagedConfigs, checkConfig, syncConfig, type ManagedConfig, type SyncReport } from "./configSync.js";

function printHeader(title: string) {
  console.log("========================");
  console.log(title);
  console.log("");
}

function printFooter() {
  console.log("========================");
}

async function confirm(promptText: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(promptText);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

function runCheck() {
  const configs = findManagedConfigs();
  if (configs.length === 0) {
    console.log("*.example.yaml が見つかりませんでした。");
    process.exitCode = 0;
    return;
  }

  printHeader("設定ファイル差分チェック(確認のみ・更新はしません)");

  let anyIssue = false;
  for (const cfg of configs) {
    const result = checkConfig(cfg);
    if (result.isNew) {
      anyIssue = true;
      console.log(`■ ${cfg.name}.yaml : 未作成`);
      console.log(`  ${basename(cfg.exampleFile)} をもとに作成できます(pnpm run config:update)`);
      console.log("");
      continue;
    }
    if (result.missing.length === 0) {
      console.log(`■ ${cfg.name}.yaml : 差分なし`);
      console.log("");
      continue;
    }
    anyIssue = true;
    console.log(`■ ${cfg.name}.yaml : 不足項目 ${result.missing.length}件`);
    for (const path of result.missing) console.log(`  - ${path}`);
    console.log("");
  }

  if (anyIssue) {
    console.log("不足項目を反映するには: pnpm run config:update");
  } else {
    console.log("すべての設定ファイルが最新です。");
  }
  printFooter();

  // 差分の有無はエラーではないため、常に正常終了(終了コード0)とする
  process.exitCode = 0;
}

function printPlannedChange(cfg: ManagedConfig, report: SyncReport) {
  console.log(`■ ${cfg.name}.yaml`);
  if (report.status === "created") {
    console.log(`  [新規作成] ${cfg.name}.example.yaml をそのままコピーします`);
  } else if (report.status === "updated") {
    console.log(`  [追記] バックアップ: ${cfg.name}.yaml.backup を作成した上で、以下を追加します`);
    for (const p of report.added) console.log(`    + ${p}`);
    if (report.needsReview.length > 0) {
      console.log("  ⚠ 追加後に手動確認が必要そうな項目(例のプレースホルダー値):");
      for (const p of report.needsReview) console.log(`    - ${p}`);
    }
  }
  console.log("");
}

async function runUpdate() {
  const configs = findManagedConfigs();
  if (configs.length === 0) {
    console.log("*.example.yaml が見つかりませんでした。");
    process.exitCode = 0;
    return;
  }

  // まず書き込まずにプレビューだけ計算する
  const plans = configs.map((cfg) => ({ cfg, report: syncConfig(cfg, { write: false }) }));
  const changed = plans.filter((p) => p.report.status !== "unchanged");

  if (changed.length === 0) {
    console.log("すべての設定ファイルが最新です。変更はありません。");
    process.exitCode = 0;
    return;
  }

  printHeader("以下の変更を行います(まだ実行していません)");
  for (const { cfg, report } of changed) {
    printPlannedChange(cfg, report);
  }
  console.log("既存の値・配列・APIキー等は一切変更しません。上記の追加のみ行います。");
  printFooter();

  const proceed = await confirm("続行しますか？ (Y/N): ");
  if (!proceed) {
    console.log("中止しました。ファイルは変更していません。");
    process.exitCode = 0;
    return;
  }

  console.log("");
  printHeader("設定ファイル更新完了");

  for (const { cfg } of changed) {
    const report = syncConfig(cfg, { write: true });
    console.log(`■ ${cfg.name}.yaml`);

    if (report.status === "created") {
      console.log(`  新規作成しました(${cfg.name}.example.yaml をもとに)`);
      console.log("  中身を編集してから使用してください。");
    } else {
      console.log(`  バックアップ: ${basename(report.backupFile ?? "")}`);
      console.log("");
      console.log("  追加された項目:");
      for (const p of report.added) console.log(`    - ${p}`);
      console.log("");
      console.log("  保持した項目(トップレベル):");
      for (const k of report.keptTopLevelKeys) console.log(`    - ${k}`);
      if (report.needsReview.length > 0) {
        console.log("");
        console.log("  手動確認が必要(例のプレースホルダー値がそのまま入っています):");
        for (const p of report.needsReview) console.log(`    - ${p}`);
      }
    }
    console.log("");
  }

  printFooter();
  process.exitCode = 0;
}

async function main() {
  const mode = process.argv[2];

  if (mode === "check") {
    runCheck();
  } else if (mode === "update") {
    await runUpdate();
  } else {
    console.error("使い方: pnpm run config:check または pnpm run config:update");
    process.exitCode = 1;
  }
}

main();
