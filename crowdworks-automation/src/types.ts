export interface SearchCondition {
  name: string;
  searchUrl: string;
  minBudget?: number;
}

export interface SearchConditionsFile {
  searches: SearchCondition[];
}

export interface Job {
  id: string;
  title: string;
  url: string;
  budgetText: string;
  postedAtText: string;
  searchName: string;
}

export interface JobWithDetail extends Job {
  description: string;
}

export interface JobDraft extends JobWithDetail {
  draft: string;
}
