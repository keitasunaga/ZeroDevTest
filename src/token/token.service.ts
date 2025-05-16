import { Injectable, Logger } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { createPublicClient, http, createWalletClient, getContract, type Hex, type Hash, zeroAddress, encodeFunctionData } from 'viem';
import { sepolia } from 'viem/chains';
import MyTokenABI from '../abi/MyToken.json';
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { privateKeyToAccount } from 'viem/accounts';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly tokenContractAddress: Hex;
  private readonly zerodevRpc = process.env.ZERODEV_RPC;
  private readonly sepoliaRpc = process.env.SEPOLIA_RPC_URL;

  constructor(private readonly walletService: WalletService) {
    // 環境変数からトークンコントラクトアドレスを取得
    const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    if (!tokenAddress) {
      throw new Error('TOKEN_CONTRACT_ADDRESS is not set');
    }
    this.tokenContractAddress = tokenAddress as Hex;
  }

  // トークンの残高を取得
  async getTokenBalance(walletId: string): Promise<bigint> {
    try {
      if (!this.tokenContractAddress) {
        throw new Error('TOKEN_CONTRACT_ADDRESS環境変数が設定されていません');
      }

      // ウォレット情報を取得
      const wallet = await this.walletService.getWalletByAddress(walletId);
      if (!wallet) {
        throw new Error('ウォレットが見つかりません');
      }

      if (!this.zerodevRpc) {
        throw new Error('ZERODEV_RPC環境変数が設定されていません');
      }

      // 公開クライアントの作成
      const publicClient = createPublicClient({
        transport: http(this.zerodevRpc),
        chain: sepolia,
      });

      // トークンコントラクトの呼び出し
      const balance = await publicClient.readContract({
        address: this.tokenContractAddress as Hex,
        abi: MyTokenABI.abi,
        functionName: 'balanceOf',
        args: [wallet.walletAddress as Hex],
      });

      return balance as bigint;
    } catch (error) {
      console.error('Token balance fetch failed:', error);
      throw new Error(`トークン残高の取得に失敗しました: ${error.message}`);
    }
  }

  // トークンの情報（名前、シンボル）を取得
  async getTokenInfo(): Promise<{ name: string; symbol: string }> {
    try {
      if (!this.tokenContractAddress) {
        throw new Error('TOKEN_CONTRACT_ADDRESS環境変数が設定されていません');
      }

      if (!this.zerodevRpc) {
        throw new Error('ZERODEV_RPC環境変数が設定されていません');
      }

      // 公開クライアントの作成
      const publicClient = createPublicClient({
        transport: http(this.zerodevRpc),
        chain: sepolia,
      });

      // トークン名とシンボルを取得
      const [name, symbol] = await Promise.all([
        publicClient.readContract({
          address: this.tokenContractAddress as Hex,
          abi: MyTokenABI.abi,
          functionName: 'name',
        }),
        publicClient.readContract({
          address: this.tokenContractAddress as Hex,
          abi: MyTokenABI.abi,
          functionName: 'symbol',
        }),
      ]);

      return {
        name: name as string,
        symbol: symbol as string,
      };
    } catch (error) {
      console.error('Token info fetch failed:', error);
      throw new Error(`トークン情報の取得に失敗しました: ${error.message}`);
    }
  }

  /**
   * 通常のトランザクションでトークンを転送する（ガス代が必要）
   * @param fromWalletId 送信元ウォレットID
   * @param toAddress 受信先アドレス
   * @param amount 転送量（wei単位）
   * @returns トランザクションハッシュ
   */
  async transferTokenWithGas(
    fromWalletId: string,
    toAddress: string,
    amount: bigint,
  ): Promise<Hash> {
    try {
      // 環境変数のチェック
      if (!this.sepoliaRpc) {
        throw new Error('SEPOLIA_RPC_URL is not set');
      }

      // ウォレット情報の取得
      const wallet = await this.walletService.getWalletByAddress(fromWalletId);
      if (!wallet) {
        throw new Error(`Wallet not found: ${fromWalletId}`);
      }

      // ウォレットクライアントの作成（秘密鍵を使用）
      const walletClient = createWalletClient({
        account: privateKeyToAccount(wallet.privateKey as Hex),
        transport: http(this.sepoliaRpc),
        chain: sepolia,
      });

      // トークンコントラクトのインスタンス作成
      const tokenContract = getContract({
        address: this.tokenContractAddress,
        abi: MyTokenABI.abi,
        client: walletClient,
      });

      // transfer関数の呼び出し
      const hash = await tokenContract.write.transfer([toAddress as Hex, amount]);

      this.logger.log(`Token transfer with gas initiated: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(`Error in transferTokenWithGas: ${error.message}`);
      throw error;
    }
  }

  /**
   * ZeroDevを使用してトークンを転送する（ガス代不要）
   * @param fromWalletId 送信元ウォレットID
   * @param toAddress 受信先アドレス
   * @param amount 転送量（wei単位）
   * @returns トランザクションハッシュ
   */
  async transferTokenWithoutGas(
    fromWalletId: string,
    toAddress: string,
    amount: bigint,
  ): Promise<Hash> {
    try {
      // 環境変数のチェック
      if (!this.zerodevRpc) {
        throw new Error('ZERODEV_RPC is not set');
      }

      // ウォレット情報の取得
      const wallet = await this.walletService.getWalletByAddress(fromWalletId);
      if (!wallet) {
        throw new Error(`Wallet not found: ${fromWalletId}`);
      }

      // パラメータの設定
      const chain = sepolia;
      const entryPoint = getEntryPoint("0.7");
      const kernelVersion = KERNEL_V3_1;

      // 公開クライアントの作成
      const publicClient = createPublicClient({
        transport: http(this.zerodevRpc),
        chain,
      });

      // EOA署名者の作成
      const signer = privateKeyToAccount(wallet.privateKey as Hex);

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

      // transfer関数の呼び出し用のデータをエンコード
      const transferData = await account.encodeCalls([
        {
          to: this.tokenContractAddress,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: MyTokenABI.abi,
            functionName: 'transfer',
            args: [toAddress as Hex, amount],
          }),
        },
      ]);

      // UserOperationを送信
      const userOpHash = await kernelClient.sendUserOperation({
        callData: transferData,
      });

      this.logger.log(`Token transfer without gas initiated: ${userOpHash}`);

      // トランザクションの完了を待つ
      const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      this.logger.log(`Token transfer without gas completed: ${receipt.receipt.transactionHash}`);
      return receipt.receipt.transactionHash;
    } catch (error) {
      this.logger.error(`Error in transferTokenWithoutGas: ${error.message}`);
      throw error;
    }
  }
} 