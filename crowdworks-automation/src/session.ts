import { existsSync } from "node:fs";
import { join } from "node:path";
import type { BrowserContext } from "playwright";
import { config } from "./config.js";

/**
 * ログインセッション(Cookie等)の保存先。
 * crowdworks-automation/data/ は .gitignore で除外済みのため、
 * このファイルがGitに含まれることはない。
 */
export const sessionFilePath = join(config.dataDir, "session.json");

export function hasSavedSession(): boolean {
  return existsSync(sessionFilePath);
}

export async function saveSession(context: BrowserContext): Promise<void> {
  await context.storageState({ path: sessionFilePath });
}
