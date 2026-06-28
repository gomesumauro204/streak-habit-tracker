# 福原｜AI業務サポート Official

業務改善ツールの制作実績・対応範囲を紹介する営業用ポートフォリオサイトです。

---

## ローカル起動方法

```bash
cd portfolio
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

---

## Vercel公開手順

1. [Vercel](https://vercel.com/) にログイン
2. 「Add New Project」→ このリポジトリを選択
3. **Root Directory** に `portfolio` を指定
4. Framework Preset: `Vite` を選択
5. 「Deploy」ボタンを押す

---

## 実績データの追加方法

`src/data/tools.ts` の `tools` 配列に追加するだけです。

```ts
{
  industry: "教育",
  title: "学習進捗管理ツール",
  status: "準備中",
  problem: "生徒ごとの学習状況や課題の管理が分散し、確認に時間がかかる。",
  features: [
    "生徒ごとの進捗管理",
    "課題の登録",
    "対応状況の確認"
  ],
  link: ""
}
```

追加するとカードが自動で増え、ジャンルフィルターにも自動反映されます。

---

## 公開済みリンクを後から追加する方法

`src/data/tools.ts` で該当ツールの `link` にURLを入力します。

```ts
link: "https://example.vercel.app/"
```

`link` が空欄の場合は「準備中」と表示されます。

---

## ジャンルを追加する方法

`industry` に新しいジャンル名を設定するだけです。フィルターボタンに自動追加されます。

```ts
industry: "医療"
```

---

## サイト名・リンクの変更

| 変更内容 | 編集場所 |
|---|---|
| サイト名 | `src/App.tsx` 上部の `SITE_NAME` |
| 相談ボタンのリンク | `src/App.tsx` 上部の `CONTACT_LINK` |
| ページタイトル（タブ名） | `index.html` の `<title>` タグ |
