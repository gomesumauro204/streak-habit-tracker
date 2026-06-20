# Streak — 習慣トラッカー

毎日の習慣を記録し、連続達成日数（ストリーク）とヒートマップで可視化するWebアプリケーションです。  
クラウドワークスのポートフォリオ向けに、コード品質とUIデザインの両方にこだわって開発しました。

## 機能一覧

| 機能 | 説明 |
|------|------|
| 習慣の登録・編集・削除 | タイトル、アイコン（絵文字）、カラーを設定可能 |
| 今日の達成記録 | チェックボックスで達成/未達成をワンタップで切り替え |
| ストリーク表示 | 連続達成日数をリアルタイムで計算・表示 |
| ヒートマップ | 過去1年分の達成履歴をGitHub風カレンダーで可視化 |
| ダークモード | ライト/ダーク切り替え（システム設定にも対応） |
| レスポンシブ | スマートフォン・タブレット・デスクトップに対応 |

## スクリーンショット

> ローカル起動後、以下の画面をキャプチャして差し替えてください。

### ライトモード — 今日の習慣一覧

![ライトモード](./docs/screenshots/light-mode.png)

### ダークモード — ヒートマップ展開

![ダークモード](./docs/screenshots/dark-mode-heatmap.png)

### モバイル表示

![モバイル](./docs/screenshots/mobile.png)

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 19 + TypeScript + Vite |
| スタイリング | Tailwind CSS v4 |
| バックエンド | Node.js + Express + TypeScript |
| データベース | SQLite（better-sqlite3） |
| 構成 | pnpm workspaces モノレポ |

## ディレクトリ構成

```
.
├── frontend/          # React フロントエンド
│   ├── src/
│   │   ├── api/       # APIクライアント
│   │   ├── components/# UIコンポーネント
│   │   ├── hooks/     # カスタムフック
│   │   └── types.ts   # 型定義
│   └── vite.config.ts # 開発サーバー + APIプロキシ
├── backend/           # Express バックエンド
│   ├── src/
│   │   ├── db/        # SQLite初期化・スキーマ
│   │   ├── routes/    # REST APIルート
│   │   ├── services/  # ビジネスロジック（ストリーク計算等）
│   │   └── middleware/# エラーハンドリング
│   └── data/          # SQLiteデータファイル（自動生成）
├── package.json       # ワークスペースルート
└── README.md
```

## セットアップ & 起動

### 前提条件

- Node.js 20 以上
- pnpm 8 以上（`npm install -g pnpm` でインストール可）

### インストール

```bash
# リポジトリルートで実行
pnpm install
```

### 開発サーバー起動

```bash
# フロントエンド (localhost:5173) + バックエンド (localhost:3001) を同時起動
pnpm dev
```

ブラウザで http://localhost:5173 を開いてください。

### 個別起動

```bash
# バックエンドのみ
pnpm --filter backend dev

# フロントエンドのみ
pnpm --filter frontend dev
```

### 本番ビルド

```bash
pnpm build
pnpm start   # バックエンドのみ起動（ビルド済み）
```

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/api/habits` | 全習慣一覧（ストリーク付き） |
| `GET` | `/api/habits/:id` | 単一習慣の取得 |
| `POST` | `/api/habits` | 習慣の作成 |
| `PUT` | `/api/habits/:id` | 習慣の更新 |
| `DELETE` | `/api/habits/:id` | 習慣の削除 |
| `PUT` | `/api/habits/:id/toggle` | 今日の達成状態をトグル |
| `GET` | `/api/habits/:id/heatmap` | ヒートマップデータ（過去365日） |

## DBスキーマ

```sql
-- 習慣テーブル
CREATE TABLE habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 達成記録テーブル
CREATE TABLE completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL,          -- YYYY-MM-DD
  completed INTEGER NOT NULL,
  UNIQUE(habit_id, date)
);
```

## デザイン方針

- **テーマカラー**: ティール（`#14b8a6`）— 成長・継続をイメージ
- **フォント**: Plus Jakarta Sans — モダンで読みやすいサンセリフ
- **レイアウト**: 余白を活かしたミニマルデザイン、カードベースのUI
- **ダークモード**: CSS変数ベースでスムーズに切り替え

## ライセンス

MIT
