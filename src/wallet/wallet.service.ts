import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Wallet } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
  ) { }

  private readonly encryptionKey = process.env.ENCRYPTION_KEY || 'default_encryption_key';

  // 秘密鍵の暗号化
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  // 秘密鍵の復号化
  private decrypt(encryptedText: string): string {
    const [ivHex, encryptedHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // ウォレットの作成
  async createWallet(userId: string, privateKey: string, chainId: number): Promise<Wallet> {
    // 秘密鍵を暗号化
    const encryptedPrivateKey = this.encrypt(privateKey);

    // ウォレット情報をデータベースに保存
    return this.prisma.wallet.create({
      data: {
        userId,
        privateKey: encryptedPrivateKey,
        walletAddress: '0x...', // ZeroDevから取得した実際のアドレス
        chainId,
        walletType: 'ecdsa',
        metadata: {
          createdAt: new Date(),
        }
      }
    });
  }

  // ユーザーIDとチェーンIDでウォレットを取得
  async getWalletByUserId(userId: string, chainId: number): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: {
        userId_chainId: {
          userId,
          chainId,
        }
      }
    });
  }

  // ウォレットアドレスでウォレットを取得
  async getWalletByAddress(walletAddress: string): Promise<Wallet | null> {
    return this.prisma.wallet.findFirst({
      where: {
        walletAddress
      }
    });
  }

  // ウォレットの秘密鍵を取得（復号化済み）
  async getDecryptedPrivateKey(walletId: string): Promise<string> {
    const wallet = await this.prisma.wallet.findUnique({
      where: {
        id: walletId
      }
    });

    if (!wallet) {
      throw new Error('ウォレットが見つかりません');
    }

    return this.decrypt(wallet.privateKey);
  }
} 