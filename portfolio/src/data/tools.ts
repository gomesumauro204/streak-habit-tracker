// =============================================
// 制作実績データ
// =============================================
// 新しいツールを追加する場合は、この配列に
// 以下の形式でデータを追加するだけでOKです。
//
// {
//   industry: "業種名",
//   title: "ツール名",
//   status: "公開中" | "準備中",
//   problem: "課題の説明",
//   features: ["機能1", "機能2", "機能3"],
//   link: "https://example.vercel.app/"  // 準備中の場合は "" のままでOK
// }
// =============================================

export type ToolStatus = '公開中' | '準備中'

export interface Tool {
  industry: string
  title: string
  status: ToolStatus
  problem: string
  features: string[]
  link: string
}

export const tools: Tool[] = [
  // ---- 介護 ----
  {
    industry: '介護',
    title: '介護申し送りノート',
    status: '公開中',
    problem: '申し送り内容の記録・共有が属人的になりやすく、確認漏れが発生しやすい。',
    features: [
      '利用者ごとの申し送り記録',
      '日付・内容の管理',
      'スマホでも確認しやすい画面',
    ],
    link: 'https://kaigo-handover.vercel.app/',
  },

  // ---- 不動産 ----
  {
    industry: '不動産',
    title: '物件管理サポートツール',
    status: '準備中',
    problem: '物件情報や対応状況の管理がバラバラになりやすく、確認に時間がかかる。',
    features: [
      '物件情報の一覧管理',
      '対応状況の整理',
      '確認しやすいカード型表示',
    ],
    link: '',
  },

  // ---- 事務作業 ----
  {
    industry: '事務作業',
    title: 'タスク・進捗管理ツール',
    status: '準備中',
    problem: '日々の細かい作業の進捗が見えにくく、抜け漏れが起きやすい。',
    features: [
      'タスク登録',
      '進捗ステータス管理',
      '優先度の整理',
    ],
    link: '',
  },

  // ---- その他 ----
  {
    industry: 'その他',
    title: '業務効率化ミニツール',
    status: '準備中',
    problem: '手作業で行っている単純作業に時間がかかる。',
    features: [
      '入力内容の整理',
      '確認画面の表示',
      '簡単なデータ管理',
    ],
    link: '',
  },

  // ---- ここに新しいツールを追加してください ----
  // 例：
  // {
  //   industry: '飲食店',
  //   title: '予約・顧客管理サポートツール',
  //   status: '準備中',
  //   problem: '予約状況や顧客情報が紙やLINEに分散し、確認に時間がかかる。',
  //   features: ['予約情報の一覧管理', '顧客情報の記録', '対応状況の確認'],
  //   link: '',
  // },
]
