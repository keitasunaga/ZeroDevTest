FROM node:20-alpine

WORKDIR /app
# OpenSSL関連のパッケージをインストール
RUN apk add --no-cache openssl

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

# Prismaクライアントを先に生成
RUN pnpm prisma generate

# その後にビルドを実行
RUN pnpm run build

# アプリケーションのコピー
COPY . .

# 開発モードで実行
CMD ["pnpm", "run", "start:dev"] 