export type ContractType = "fixed" | "hourly";

export interface SearchCondition {
  name: string;
  searchUrl: string;
  /** 契約方式。省略時は "fixed"(固定報酬)として扱う */
  contractType?: ContractType;
  /** contractType: "fixed" のときの最低契約金額(円) */
  minBudget?: number;
  /** contractType: "hourly" のときの最低時給(円) */
  minHourlyRate?: number;
  /** タイトル・案件情報にこれらの語を含む場合は除外 */
  excludeKeywords?: string[];
  /** true の場合、一覧に「新着」表示がある案件のみ対象 */
  newOnly?: boolean;
  /** true の場合、募集終了・受付終了の案件を除外 */
  openOnly?: boolean;
}

export interface SearchConditionsFile {
  searches: SearchCondition[];
}

export interface Profile {
  name: string;
  title?: string;
  strengths: string[];
  portfolio?: {
    url: string;
    note?: string;
  };
  availability?: {
    hours?: string;
    scope?: string;
  };
  extraNotes?: string[];
  sampleApplication?: string;
}

export interface Job {
  id: string;
  title: string;
  url: string;
  /** 一覧のカード全体のテキスト(予算・新着表示・募集状況などを含む、判定用の生データ) */
  contextText: string;
  searchName: string;
}

export interface JobWithDetail extends Job {
  description: string;
}

export interface JobCriteria {
  /** 歓迎したい案件の特徴(参考情報。これに一致しなくても内容次第で採用され得る) */
  acceptKeywords: string[];
  /** 避けたい案件の特徴(参考情報。これに一致しても内容次第で採用され得る) */
  rejectKeywords: string[];
  /** キーワードだけでは表現しづらい判定方針の補足(自由記述、省略可) */
  description?: string;
}

/**
 * 案件本文からAIが抽出する構造化情報。
 * 本文に記載が無い項目は undefined(または "不明")のまま扱う(推測で埋めない)。
 */
export interface JobMetadata {
  clientName?: string;
  budgetOrRate?: string;
  deadline?: string;
  requiredConditions?: string;
  welcomeConditions?: string;
  expectedHours?: string;
  deliveryDate?: string;
  applicationInstructions?: string;
  applicationQuestions?: string[];
  hasAttachments?: boolean;
}

export type JobClassification = "priority" | "candidate" | "review" | "excluded";

export interface ScreeningResult {
  classification: JobClassification;
  reason: string;
  metadata: JobMetadata;
}

export interface ScreenedJob extends JobWithDetail {
  screening: ScreeningResult;
}

export interface DraftResult {
  draft: string;
  candidacyReason: string;
  concerns: string;
  questionsToConfirm: string[];
  suggestedRate: string;
}

export interface JobDraft extends ScreenedJob {
  draftResult: DraftResult;
}

/** 応募文生成に必要な最小限の案件情報(本文全文は含まない) */
export interface JobRef {
  title: string;
  url: string;
  searchName?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface DraftGenerationOutcome {
  success: boolean;
  result?: DraftResult;
  /** 試行回数(1〜2。2回目は短い形式での再試行) */
  attempts: number;
  /** 各試行のトークン使用量 */
  usages: TokenUsage[];
  /** success:false のときの失敗理由 */
  failureReason?: string;
}
