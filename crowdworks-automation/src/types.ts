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

export interface JobDraft extends JobWithDetail {
  draft: string;
}

export interface JobCriteria {
  /** 歓迎したい案件の特徴(参考情報。これに一致しなくても内容次第で採用され得る) */
  acceptKeywords: string[];
  /** 避けたい案件の特徴(参考情報。これに一致しても内容次第で採用され得る) */
  rejectKeywords: string[];
  /** キーワードだけでは表現しづらい判定方針の補足(自由記述、省略可) */
  description?: string;
}

export interface ScreeningResult {
  accepted: boolean;
  reason: string;
}

export interface ScreenedJob extends JobWithDetail {
  screening: ScreeningResult;
}
