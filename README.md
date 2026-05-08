# nippo-local

ローカル環境で日報を扱うためのプロジェクトです。

このリポジトリでは、実装より先に目的・仕様・確認方法を言語化する
**ドキュメントファースト**な開発スタイルを採用します。

## 開発方針

1. Issue で背景、目的、受け入れ条件を書く
2. 必要に応じて `docs/` に仕様や設計判断を残す
3. 実装は Issue とドキュメントに沿って進める
4. PR では実装内容、確認方法、ドキュメント更新を明示する
5. マージ前に README / docs / 実装の矛盾をなくす

## リポジトリ構成

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── documentation.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── decisions/
│   ├── notes/
│   ├── specs/
│   └── templates/
└── README.md
```

## ドキュメントの置き場所

- `README.md`: プロジェクトの概要、開発方針、セットアップ、主要な使い方
- `docs/specs/`: 機能仕様、画面仕様、API 仕様
- `docs/decisions/`: 技術選定や設計判断の記録
- `docs/notes/`: 調査メモ、作業メモ、議事メモ
- `docs/templates/`: 仕様書、設計判断、メモの雛形

## 開発フロー

### 1. Issue を作る

新しい作業は Issue から始めます。

- 機能追加: `Feature request`
- 不具合修正: `Bug report`
- ドキュメント更新: `Documentation`

Issue には最低限、次の内容を書きます。

- 背景
- 目的
- スコープ
- 受け入れ条件
- 確認方法

### 2. 必要なドキュメントを書く

実装前に仕様や判断が必要な場合は、`docs/templates/` の雛形をコピーして使います。

```text
docs/templates/spec.md       -> docs/specs/YYYY-MM-DD-name.md
docs/templates/decision.md   -> docs/decisions/YYYY-MM-DD-name.md
docs/templates/note.md       -> docs/notes/YYYY-MM-DD-name.md
```

### 3. ブランチを切る

Issue 単位でブランチを作成します。

```bash
git switch -c feature/<short-name>
git switch -c fix/<short-name>
git switch -c docs/<short-name>
```

### 4. 実装する

実装中に仕様が変わった場合は、コードだけでなく Issue や `docs/` も更新します。

### 5. Pull Request を作る

PR テンプレートに沿って、次の内容を記載します。

- 概要
- 関連 Issue / Docs
- 変更内容
- ドキュメントファースト確認
- 確認方法
- レビュー観点
- リスク・残課題

## ドキュメントを書く基準

すべてを重厚な仕様書にする必要はありません。
次のどれかに当てはまる場合は、Issue とは別に `docs/` へ残します。

- 後から読み返す可能性が高い仕様
- 実装方針に複数の選択肢がある判断
- セットアップ、運用、調査結果など再利用したい知識
- PR の説明だけでは流れてしまう重要な背景

## 完了の定義

作業は、コードが動くだけでは完了ではありません。

- [ ] Issue の受け入れ条件を満たしている
- [ ] 確認方法が実行されている
- [ ] README または `docs/` が必要に応じて更新されている
- [ ] 実装とドキュメントに矛盾がない
- [ ] 残課題が Issue または PR に記録されている

## 命名ルール

ドキュメントのファイル名は、日付と短い説明を組み合わせます。

```text
docs/specs/2026-05-08-daily-report.md
docs/decisions/2026-05-08-storage-choice.md
docs/notes/2026-05-08-setup-investigation.md
```

ブランチ名は、作業種別と短い説明を組み合わせます。

```text
feature/add-daily-report
fix/save-error
docs/update-development-flow
```

## コミットメッセージ

コミットメッセージは、変更の種類が分かる形にします。

```text
feat: add daily report form
fix: handle empty report title
docs: add development flow
refactor: simplify report storage
test: add report validation tests
```

## 関連ドキュメント

- [docs/README.md](docs/README.md)
- [仕様書テンプレート](docs/templates/spec.md)
- [設計判断テンプレート](docs/templates/decision.md)
- [メモテンプレート](docs/templates/note.md)
