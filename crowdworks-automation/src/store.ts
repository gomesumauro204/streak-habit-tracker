import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";

const seenJobsPath = join(config.dataDir, "seen-jobs.json");

function ensureDataDir() {
  if (!existsSync(config.dataDir)) {
    mkdirSync(config.dataDir, { recursive: true });
  }
}

export function loadSeenJobIds(): Set<string> {
  ensureDataDir();
  if (!existsSync(seenJobsPath)) {
    return new Set();
  }
  const raw = readFileSync(seenJobsPath, "utf-8");
  const ids = JSON.parse(raw) as string[];
  return new Set(ids);
}

export function saveSeenJobIds(ids: Set<string>) {
  ensureDataDir();
  writeFileSync(seenJobsPath, JSON.stringify([...ids], null, 2), "utf-8");
}
