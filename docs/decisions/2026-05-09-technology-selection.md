# Decision: ローカル日報アプリの技術選定

## ステータス

Proposed

## 日付

2026-05-09

## 背景

このプロジェクトでは、メモ、写真、録音、文字起こしをローカル環境に保存し、日報や月報へ再利用できるようにする。

MVP では、外部サービス連携や高度な自動分類よりも、次の性質を優先する。

- ローカルで完結して動作する
- 保存データをバックアップしやすい
- メモ、添付ファイル、日報、月報を後から検索しやすい
- LLM や意味検索を後から追加できる
- 実装を複雑にしすぎず、早く動くものを作れる

## 決定

MVP の技術スタックは次を基本方針とする。

### サーバー

- TypeScript
- Express
- SQLite へのアクセスには `better-sqlite3` を第一候補とする
- API の入出力検証には Zod を検討する

### UI

- Vite
- Vue 3
- TypeScript
- Vue Router
- Pinia
- Vuetify

コンポーネントは、画面、レイアウト、機能単位の UI 部品に分ける。

想定する構成:

```text
apps/web/src/
  components/
    layout/
    records/
    reports/
  plugins/
  router/
  stores/
  views/
```

### バックエンド設計

- 基本的にオニオンアーキテクチャを採用する
- domain、application、infrastructure、presentation を分ける
- domain は Express や SQLite に依存させない
- application はユースケースを表現する
- infrastructure は SQLite やファイルシステムなどの外部詳細を扱う
- presentation は HTTP ルーティングと入出力変換を扱う

想定する構成:

```text
apps/api/src/
  domain/
  application/
  infrastructure/
  presentation/
  shared/
```

### DB

- SQLite
- キーワード検索には FTS5 を使う
- 日本語検索では `trigram` tokenizer を検討する

### LLM / 意味検索

- MVP では必須にしない
- LLM を活用する場合は、検索拡張として `sqlite-vec` を検討する
- Embedding、ベクトル検索、LLM による生成は責務を分ける

### ファイル保存

- 写真や音声は SQLite に直接保存せず、ローカルファイルとして保存する
- SQLite には添付ファイルの相対パスとメタデータを保存する
- `data/` ディレクトリ全体をコピーすればバックアップできる構成にする

想定する保存構成:

```text
data/
  nippo.sqlite
  attachments/
    images/
    audio/
  reports/
    daily/
    monthly/
  backups/
```

### 開発環境

- Node.js は mise 経由で使用する
- ローカル実行と検証用に npm workspaces を使う
- サーバー起動は Docker Compose で容易にできるようにする
- よく使う操作は Makefile にまとめる

## 理由

- TypeScript でサーバーと UI の型をそろえられる
- Express は学習コストが低く、MVP の API 実装に十分な機能を持つ
- Vite + Vue 3 は小さく始めやすく、日報作成 UI のようなフォーム中心の画面と相性がよい
- Vue Router により、記録一覧、記録詳細、日報作成、月報作成などの画面を自然に分けられる
- Pinia により、検索条件、編集中の日報、選択中の記録などの状態を扱いやすい
- SQLite は単一ファイルで扱え、ローカルアプリの保存先としてバックアップしやすい
- FTS5 を使うことで、タイトル、本文、タグ、文字起こし本文などを横断検索できる
- `sqlite-vec` を後から足す構成にしておくと、LLM 活用時に意味検索を追加しやすい
- 写真や音声をファイルとして分けることで、DB の肥大化を避け、添付ファイルの管理やバックアップがしやすい

## 検討した代替案

### 案 1: Tauri + Vue + SQLite

- 良い点:
  - デスクトップアプリとして配布しやすい
  - OS のファイルアクセスやダイアログとの統合がしやすい
  - 将来的にローカルアプリ感を強められる
- 懸念:
  - MVP では Rust 側の実装や権限設定、パッケージングの学習コストが増える
  - まず仕様を固める段階では、実装範囲が広がりやすい

### 案 2: Markdown ファイル中心の保存

- 良い点:
  - 人間が直接読み書きしやすい
  - Git などで差分管理しやすい
  - エディタとの相性がよい
- 懸念:
  - タグ、添付、日付、利用済みフラグなどの構造化データを扱いにくい
  - 検索や集計の実装が複雑になりやすい
  - 写真、音声、文字起こしとの関連を保つ仕組みが別途必要になる

### 案 3: ORM を全面採用する

- 良い点:
  - 型安全なクエリを書きやすい
  - マイグレーション管理が整いやすい
- 懸念:
  - FTS5 や `sqlite-vec` の仮想テーブルを扱う場合、生 SQL が必要になりやすい
  - MVP では ORM の抽象化よりも、検索や保存の仕様を素直に SQL へ落とす方が早い可能性がある

## 影響

- API は Express 上に REST API として実装する
- UI は Vue Router を前提に、画面単位で構成する
- 検索処理は通常検索、意味検索、ハイブリッド検索を分けられるように設計する
- DB 操作は repository 層を用意し、FTS5 や将来の `sqlite-vec` 利用を隠蔽する
- 日報や月報は Markdown として出力できるようにする
- 生成物は、記録とは別に `reports` として扱うことを検討する

検索サービスの責務イメージ:

```text
SearchService
  keywordSearch(): FTS5 によるキーワード検索
  vectorSearch(): sqlite-vec による意味検索
  hybridSearch(): FTS5 と意味検索の組み合わせ
```

LLM 活用時の責務イメージ:

```text
EmbeddingProvider
  テキストをベクトル化する

VectorSearch
  類似する記録を探す

ReportGenerator
  日報や月報の下書きを生成する
```

## 見直し条件

- デスクトップアプリとして配布する必要が強くなった場合、Tauri 化を検討する
- FTS5 の日本語検索精度が実用に足りない場合、tokenizer や検索方式を見直す
- LLM による日報、月報生成の重要度が上がった場合、embedding 保存と `sqlite-vec` の導入を検討する
- 複数端末同期やクラウド保存が必要になった場合、保存方式と同期方式を再検討する
- 写真や音声の件数が増え、バックアップや容量管理が課題になった場合、添付ファイル管理方針を見直す

## 関連

- [メモ・写真・録音から日報/月報を作る機能要件](../specs/summary/2026-05-08-requirements.md)
- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [sqlite-vec](https://github.com/asg017/sqlite-vec)
