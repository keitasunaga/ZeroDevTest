import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Wallet } from '@prisma/client';
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { http, createPublicClient, zeroAddress, type Hex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
  ) { }


  private readonly zerodevRpc = process.env.ZERODEV_RPC;


  // 新しいZeroDevウォレットの作成とデプロイを一度に行う
  async createAndDeployZeroDevWallet(userId: string, chainId: number): Promise<Wallet> {
    try {
      // 新しい秘密鍵を生成
      const privateKey = generatePrivateKey();

      // パラメータの設定
      const chain = sepolia;
      const entryPoint = getEntryPoint("0.7");
      const kernelVersion = KERNEL_V3_1;

      if (!this.zerodevRpc) {
        throw new Error('ZERODEV_RPC環境変数が設定されていません');
      }

      // 公開クライアントの作成
      const publicClient = createPublicClient({
        transport: http(this.zerodevRpc),
        chain,
      });

      // EOA署名者の作成
      const signer = privateKeyToAccount(privateKey);

      // ECDSAバリデータの作成
      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer,
        entryPoint,
        kernelVersion,
      });

      // ZeroDevのスマートアカウントを作成
      const account = await createKernelAccount(publicClient, {
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint,
        kernelVersion,
      });

      // アカウントアドレスを取得
      const walletAddress = account.address;
      console.log("Created wallet address:", walletAddress);

      // ウォレット情報をデータベースに保存
      const wallet = await this.prisma.wallet.create({
        data: {
          userId,
          privateKey: privateKey,
          walletAddress,
          chainId,
          walletType: 'zerodev',
          metadata: {
            createdAt: new Date(),
            isDeployed: false,
            kernelVersion,
            entryPointVersion: "0.7",
          }
        }
      });

      // ここからデプロイ処理
      try {
        // ペイマスタークライアントの作成
        const paymasterClient = createZeroDevPaymasterClient({
          chain,
          transport: http(this.zerodevRpc),
        });

        // カーネルクライアントの作成
        const kernelClient = createKernelAccountClient({
          account,
          chain,
          bundlerTransport: http(this.zerodevRpc),
          client: publicClient,
          paymaster: {
            getPaymasterData: (userOperation) => {
              return paymasterClient.sponsorUserOperation({
                userOperation,
              });
            }
          }
        });

        // デプロイするためのダミートランザクションを送信
        const userOpHash = await kernelClient.sendUserOperation({
          callData: await account.encodeCalls([
            {
              to: zeroAddress,
              value: BigInt(0),
              data: "0x",
            },
          ]),
        });

        console.log("userOp hash:", userOpHash);

        try {
          // トランザクションの完了を待つ
          const receipt = await kernelClient.waitForUserOperationReceipt({
            hash: userOpHash,
          });

          console.log('bundle txn hash: ', receipt.receipt.transactionHash);

          // メタデータを更新
          const updatedMetadata = {
            ...(wallet.metadata as Record<string, unknown>),
            isDeployed: true,
            deployedAt: new Date(),
            deploymentHash: receipt.receipt.transactionHash,
            status: 'completed',
            userOpHash: userOpHash,
          };

          // ウォレット情報を更新
          return this.prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              metadata: updatedMetadata,
            }
          });
        } catch (error) {
          console.error('Transaction receipt fetch failed:', error);

          // UserOpが開始されている場合は、保留中としてマーク
          const updatedMetadata = {
            ...(wallet.metadata as Record<string, unknown>),
            isDeployed: true,
            deployedAt: new Date(),
            userOpHash: userOpHash,
            status: 'pending',
            errorMessage: error.message,
          };

          return this.prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              metadata: updatedMetadata,
            }
          });
        }
      } catch (error) {
        console.error('ZeroDev wallet deployment failed:', error);

        // 既にデプロイ処理が開始されている場合は、エラーとせずに保留状態として記録
        if (error.message.includes('User operation already known')) {
          const updatedMetadata = {
            ...(wallet.metadata as Record<string, unknown>),
            isDeployed: true,
            deployedAt: new Date(),
            status: 'pending',
            errorMessage: error.message,
          };

          return this.prisma.wallet.update({
            where: { id: wallet.id },
            data: {
              metadata: updatedMetadata,
            }
          });
        }

        // ウォレットの作成は成功しているのでそのまま返す（デプロイは後で再試行可能）
        console.log('Wallet created but deployment failed, returning wallet:', wallet.id);
        return wallet;
      }
    } catch (error) {
      console.error('ZeroDev wallet creation/deployment failed:', error);
      throw new Error(`ウォレット作成・デプロイに失敗しました: ${error.message}`);
    }
  }

  // 既存のZeroDevウォレットを再生成（復元）
  async recoverZeroDevWallet(walletId: string): Promise<Wallet> {
    try {
      // ウォレット情報を取得
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: walletId }
      });

      if (!wallet) {
        throw new Error('ウォレットが見つかりません');
      }

      if (!this.zerodevRpc) {
        throw new Error('ZERODEV_RPC環境変数が設定されていません');
      }

      // パラメータの設定
      const chain = sepolia;
      const entryPoint = getEntryPoint("0.7");
      const kernelVersion = KERNEL_V3_1;

      // 秘密鍵をHex型に変換
      const privateKey = wallet.privateKey as Hex;

      // 公開クライアントの作成
      const publicClient = createPublicClient({
        transport: http(this.zerodevRpc),
        chain,
      });

      // EOA署名者の作成
      const signer = privateKeyToAccount(privateKey);

      // ECDSAバリデータの作成
      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer,
        entryPoint,
        kernelVersion,
      });

      // ZeroDevのスマートアカウントを再作成
      const account = await createKernelAccount(publicClient, {
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint,
        kernelVersion,
      });

      // アカウントアドレスを取得して確認
      const recoveredAddress = account.address;

      // 復元されたアドレスと保存されているアドレスが一致するか確認
      if (recoveredAddress.toLowerCase() !== wallet.walletAddress.toLowerCase()) {
        throw new Error('復元されたウォレットアドレスが一致しません');
      }

      return wallet;
    } catch (error) {
      console.error('ZeroDev wallet recovery failed:', error);
      throw new Error(`ウォレット復元に失敗しました: ${error.message}`);
    }
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

} 