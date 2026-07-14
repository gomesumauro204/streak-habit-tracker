import { basename } from "node:path";
import { findManagedConfigs, checkConfig, syncConfig } from "./configSync.js";

function printHeader(title: string) {
  console.log("========================");
  console.log(title);
  console.log("");
}

function printFooter() {
  console.log("========================");
}

function runCheck() {
  const configs = findManagedConfigs();
  if (configs.length === 0) {
    console.log("*.example.yaml が見つかりませんでした。");
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
}

function runUpdate() {
  const configs = findManagedConfigs();
  if (configs.length === 0) {
    console.log("*.example.yaml が見つかりませんでした。");
    return;
  }

  printHeader("設定ファイル更新完了");

  for (const cfg of configs) {
    const report = syncConfig(cfg, { write: true });
    console.log(`■ ${cfg.name}.yaml`);

    if (report.status === "created") {
      console.log(`  新規作成しました(${cfg.name}.example.yaml をもとに)`);
      console.log("  中身を編集してから使用してください。");
    } else if (report.status === "unchanged") {
      console.log("  差分なし(変更していません)");
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
}

const mode = process.argv[2];

if (mode === "check") {
  runCheck();
} else if (mode === "update") {
  runUpdate();
} else {
  console.error("使い方: pnpm run config:check または pnpm run config:update");
  process.exit(1);
}
