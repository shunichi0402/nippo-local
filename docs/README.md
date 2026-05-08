# Documentation

このディレクトリは、実装前後の判断を残すための場所です。

## 構成

- `specs/`: 機能仕様、画面仕様、API 仕様など
- `decisions/`: 技術選定や設計判断の記録
- `notes/`: 調査メモ、作業メモ、議事メモなど
- `templates/`: ドキュメント作成用の雛形

## 仕様書

- [メモ・写真・録音から日報/月報を作る機能要件](specs/summary/2026-05-08-requirements.md)

## 判断記録

- [ローカル日報アプリの技術選定](decisions/2026-05-09-technology-selection.md)

## 書き方の原則

- 実装前に背景、目的、受け入れ条件を書く
- 実装中に迷った判断は `decisions/` に残す
- 実装後に README や仕様書と実装の差分をなくす
- ドキュメントは完璧さよりも、次の人が動けることを優先する

## ファイル名

日付と短い名前を組み合わせます。

```text
docs/specs/2026-05-08-daily-report.md
docs/decisions/2026-05-08-use-sqlite.md
docs/notes/2026-05-08-local-setup.md
```
