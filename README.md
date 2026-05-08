<div align="center">

<img src="docs/img/logo.png" alt="Logo" width="320" />
</div>

ローカル環境で日報を扱うためのプロジェクトです。

開発ルールやドキュメントの書き方は [docs/README.md](docs/README.md) を参照してください。

## セットアップ

Node.js は mise 経由で使用します。

```sh
make install
```

Docker Compose で API と UI を起動します。

```sh
make dev
```

起動後の URL:

- UI: http://localhost:5173
- API: http://localhost:3000

ポートが使用中の場合は環境変数で変更できます。

```sh
API_PORT=3010 WEB_PORT=5174 make dev
```

よく使うコマンド:

```sh
make dev-local   # mise 経由でローカル起動
make typecheck   # 型チェック
make test        # テスト
make build       # ビルド
make db-migrate  # SQLite マイグレーション
```
