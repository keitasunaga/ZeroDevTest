# ZeroDev Wallet API

NestJSとPostgreSQLを使用したZeroDevウォレット管理APIの実装です。データアクセスにはPrismaを使用しています。

## 機能

- ウォレットの作成と管理
- 秘密鍵の安全な暗号化と保存
- ZeroDevスマートアカウントとの統合

## セットアップ手順

### Dockerを使用した環境構築

1. リポジトリをクローン
```bash
git clone <repository-url>
cd <repository-directory>
```

2. 環境変数ファイルを作成
```bash
cp .env.example .env
# .envファイルを編集して必要な環境変数を設定
```

3. Prismaクライアントを生成
```bash
pnpm prisma:generate
```

4. Dockerコンテナの起動
```bash
docker compose up -d
```

5. データベースマイグレーションの実行
```bash
pnpm prisma:migrate
```

6. アプリケーションの動作確認
```bash
curl http://localhost:3000/health
```

### 主要なエンドポイント

- `GET /wallet/:userId/:chainId` - ユーザーのウォレット情報を取得
- `POST /wallet` - 新しいウォレットを作成
- `GET /wallet/address/:walletAddress` - ウォレットアドレスからウォレット情報を取得

### Prisma Studio

Prisma Studioを使用してデータベースを視覚的に管理できます:
- URL: http://localhost:5555

Docker内で実行されるPrisma Studioは自動的にデータベースに接続し、モデルを表示します。
データの閲覧、編集、フィルタリング、ソートなどの操作が可能です。

## 開発

### 依存関係のインストール

```bash
pnpm install
```

### 開発サーバーの起動

```bash
pnpm run start:dev
```

### ビルド

```bash
pnpm run build
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|---------|
| DATABASE_URL | PostgreSQL接続URI | postgresql://postgres:postgres@postgres:5432/wallet_db?schema=public |
| ENCRYPTION_KEY | 秘密鍵暗号化用のキー | - |
| ZERODEV_PROJECT_ID | ZeroDevのプロジェクトID | - |

