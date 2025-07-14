# ZeroDev Wallet API

NestJSとPostgreSQLを使用したZeroDevウォレット管理APIの実装です。データアクセスにはPrismaを使用しています。

## 機能

- ウォレットの作成と管理
- 秘密鍵の安全な暗号化と保存
- ZeroDevスマートアカウントとの統合
- ウォレット作成時の自動デプロイ機能
- Sepoliaテストネット専用設計
- ERC-20トークンの転送機能（ガス代あり/なし）
- Swagger UIによるAPI仕様の確認

## ⚠️ 重要な依存関係とバージョン互換性について

このプロジェクトでは以下のパッケージバージョンの組み合わせで動作検証しています：

```json
{
  "@zerodev/ecdsa-validator": "5.4.8",
  "@zerodev/sdk": "5.4.30",
  "viem": "2.28.0"
}
```

**重要な注意点:**
- **バージョンの互換性**: ZeroDev SDKとviemの間にはバージョン互換性の問題があります。特にviem 2.29.2以降を使用すると型の互換性エラーが発生するため、viem 2.28.0の使用を推奨します。
- **自動修正しないでください**: npm/pnpmのautofix機能で自動的に最新バージョンに更新しないでください。
- **バージョン変更時の注意**: これらのパッケージをアップデートする場合は、十分なテストを行い、型の互換性を確認してください。

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

3. Dockerイメージのビルド
```bash
docker compose build
```

4. 依存関係のインストール
```bash
docker compose run --rm nest-api pnpm install
```

5. データベースマイグレーションの実行
```bash
docker compose run --rm nest-api pnpm prisma migrate dev --name init
```

6. Dockerコンテナの起動
```bash
docker compose up -d
```

7. アプリケーションの動作確認
```bash
curl http://localhost:3000/health
```

### 主要なエンドポイント

- `GET /wallet/:userId` - ユーザーIDでウォレット情報を取得
- `GET /wallet/address/:walletAddress` - ウォレットアドレスからウォレット情報を取得
- `POST /wallet/zerodev` - 新しいZeroDevスマートアカウントを作成してデプロイ
- `POST /wallet/zerodev/recover` - 既存のZeroDevスマートアカウントを復元
- `GET /token/balance/:walletId` - ウォレットのトークン残高を取得
- `GET /token/info` - トークンの情報（名前、シンボル）を取得
- `POST /token/transfer/with-gas` - 通常のトランザクションでトークンを転送（ガス代が必要）
- `POST /token/transfer/without-gas` - ZeroDevを使用してトークンを転送（ガス代不要）

#### DID機能のエンドポイント
- `POST /did/create` - 新しいDIDを作成
- `GET /did/:didId` - DIDドキュメントを解決
- `GET /did/:didId/info` - DID情報を取得
- `POST /did/:walletId/attribute` - DID属性を設定（ガス代不要）
- `POST /did/:walletId/attribute/service` - サービス属性を設定（ガス代不要）
- `POST /did/:walletId/attribute/publickey` - 公開鍵属性を設定（ガス代不要）
- `POST /did/:walletId/delegate` - デリゲートを追加（ガス代不要）
- `DELETE /did/:walletId/delegate` - デリゲートを削除（ガス代不要）

### API仕様の確認

Swagger UIを使用してAPI仕様を確認できます：
- URL: http://localhost:3000/api

Swagger UIでは以下の機能が利用可能です：
- すべてのエンドポイントの詳細な仕様確認
- リクエスト/レスポンスのスキーマ確認
- エンドポイントのテスト実行
- APIドキュメントのダウンロード

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

### 基本設定

| 変数名 | 説明 | デフォルト値 |
|--------|------|---------|
| DATABASE_URL | PostgreSQL接続URI | postgresql://postgres:postgres@postgres:5432/wallet_db?schema=public |
| ZERODEV_RPC | ZeroDevのRPCエンドポイント | https://rpc.zerodev.app/api/v2/bundler/[YOUR_PROJECT_ID] |
| SEPOLIA_RPC_URL | SepoliaテストネットのRPCエンドポイント | - |
| TOKEN_CONTRACT_ADDRESS | ERC-20トークンのコントラクトアドレス | - |

### DID機能の設定

#### 必須環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|---------|
| DID_REGISTRY_CONTRACT_ADDRESS | ERC1056レジストリコントラクトアドレス | - |

#### オプション環境変数（デフォルト値がある）

| 変数名 | 説明 | デフォルト値 |
|--------|------|---------|
| DID_CHAIN_NAME | DIDで使用するブロックチェーン名 | sepolia |
| DID_CHAIN_ID | DIDで使用するチェーンID | 11155111 |
| DID_DEFAULT_VALIDITY_SECONDS | DID属性・デリゲートのデフォルト有効期限（秒） | 31536000（1年） |
| DID_SERVICE_ATTRIBUTE_PREFIX | サービス属性のプレフィックス | did/svc/ |
| DID_PUBLIC_KEY_ATTRIBUTE_PREFIX | 公開鍵属性のプレフィックス | did/pub/ |

## ZeroDev設定

このアプリケーションを使用するには、以下の手順でZeroDev環境を設定する必要があります：

1. [ZeroDevのウェブサイト](https://zerodev.app/)でアカウントを作成
2. 新しいプロジェクトを作成して、プロジェクトIDを取得
3. 環境変数に以下を設定：
   - ZERODEV_RPC：zerodevのダッシュボードで取得した値を設定
   - ENCRYPTION_KEY：32バイト以上の安全な文字列

### 重要な注意点

- **ZERODEV_RPC** 環境変数は必須です。この変数がないとウォレットの作成・復元・デプロイが失敗します。
- **複数バージョンの混在は避けてください**: node_modulesディレクトリに複数バージョンのviemが混在すると予期しない型エラーが発生する可能性があります。
- 実際の環境ではdocker-compose.ymlの`ZERODEV_RPC`を正しいRPCエンドポイントに更新してください。

## 注意事項

- **このアプリはSepoliaテストネット専用です**。チェーンIDは11155111に固定されています。
- 本番環境で使用する前に、適切なセキュリティ対策を行ってください

## トークン転送機能

このAPIは2種類のトークン転送方法を提供しています：

### 1. 通常のトランザクション（ガス代が必要）

```bash
curl -X POST http://localhost:3000/token/transfer/with-gas \
  -H "Content-Type: application/json" \
  -d '{
    "fromWalletId": "your-wallet-id",
    "toAddress": "recipient-address",
    "amount": "1000000000000000000"
  }'
```

- 通常のEthereumトランザクションを使用
- 送信元ウォレットにETHが必要（ガス代用）
- トランザクションの署名に秘密鍵を使用

### 2. ZeroDevトランザクション（ガス代不要）

```bash
curl -X POST http://localhost:3000/token/transfer/without-gas \
  -H "Content-Type: application/json" \
  -d '{
    "fromWalletId": "your-wallet-id",
    "toAddress": "recipient-address",
    "amount": "1000000000000000000"
  }'
```

- ZeroDevのスマートアカウントとペイマスターを使用
- ユーザーはガス代を支払う必要がない
- ペイマスターがガス代を負担
- UserOperationを使用してトランザクションを実行

### トークン情報の取得

```bash
# 残高確認
curl http://localhost:3000/token/balance/your-wallet-id

# トークン情報
curl http://localhost:3000/token/info
```

### 注意事項

- トークン転送には適切な環境変数（`SEPOLIA_RPC_URL`、`TOKEN_CONTRACT_ADDRESS`）の設定が必要です
- 通常のトランザクションを使用する場合は、送信元ウォレットに十分なETHが必要です
- ZeroDevトランザクションを使用する場合は、プロジェクトのペイマスター設定が必要です

## DID機能

このAPIは分散型ID（DID）の作成と管理機能を提供しています。ERC1056標準に基づき、ZeroDevを使用してガス代不要でDID操作が可能です。

### DID機能の使用例

#### 1. DIDの作成

```bash
curl -X POST http://localhost:3000/did/create \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "your-wallet-id"
  }'
```

#### 2. DIDの解決

```bash
# フルDIDで解決
curl http://localhost:3000/did/did:ethr:sepolia:0x1234567890123456789012345678901234567890

# アドレスのみで解決（自動でDID形式に変換）
curl http://localhost:3000/did/0x1234567890123456789012345678901234567890
```

#### 3. サービス属性の設定（ガス代不要）

```bash
curl -X POST http://localhost:3000/did/your-wallet-id/attribute/service \
  -H "Content-Type: application/json" \
  -d '{
    "serviceName": "MessagingService",
    "serviceEndpoint": "https://messaging.example.com",
    "validity": 31536000
  }'
```

#### 4. デリゲートの追加（ガス代不要）

```bash
curl -X POST http://localhost:3000/did/your-wallet-id/delegate \
  -H "Content-Type: application/json" \
  -d '{
    "delegateType": "sigAuth",
    "delegateAddress": "0x1234567890123456789012345678901234567890",
    "validity": 31536000
  }'
```

#### 5. DID情報の取得

```bash
curl http://localhost:3000/did/did:ethr:sepolia:0x1234567890123456789012345678901234567890/info
```

### DID機能の特徴

- **ガス代不要**: ZeroDevのペイマスターを使用してすべてのDID操作が無料
- **ERC1056準拠**: 標準的なEthereum DIDレジストリーを使用
- **柔軟な属性管理**: サービス、公開鍵、カスタム属性の設定が可能
- **デリゲート機能**: 他のアドレスに権限を委譲可能
- **環境変数対応**: チェーンや設定の変更が環境変数で可能

### DID機能の注意事項

- DID機能には適切な環境変数（`DID_REGISTRY_CONTRACT_ADDRESS`）の設定が必要です
- ERC1056レジストリーコントラクトが適切にデプロイされている必要があります
- ZeroDevの設定が正しく行われている必要があります

