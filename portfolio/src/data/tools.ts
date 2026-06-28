// =============================================
// 制作実績データ
// =============================================
// 新しいツールを追加する場合は、この配列にデータを追加するだけでOKです。
//
// {
//   title: "ツール名",
//   description: "説明文",
//   tags: ["タグ1", "タグ2"],
//   status: "公開中" | "準備中",
//   link: "https://example.vercel.app/"  // 準備中なら ""
// }
// =============================================

export type ToolStatus = '公開中' | '準備中'

export interface Tool {
  title: string
  description: string
  tags: string[]
  status: ToolStatus
  link: string
}

export const tools: Tool[] = [
  {
    title: '介護申し送りツール',
    description:
      '介護現場の申し送り業務を想定したWebアプリ。記録・検索・ステータス管理ができます。',
    tags: ['介護', '記録管理', 'スマホ対応'],
    status: '公開中',
    link: 'https://kaigo-handover.vercel.app/',
  },

  // ---- ここに新しい実績を追加 ----
  // 例：
  // {
  //   title: '物件管理サポートツール',
  //   description: '不動産業向けの物件情報・対応状況管理ツール。',
  //   tags: ['不動産', '一覧管理'],
  //   status: '準備中',
  //   link: '',
  // },
]
