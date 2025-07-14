import { Injectable, Logger } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import {
  createPublicClient,
  http,
  createWalletClient,
  getContract,
  type Hex,
  type Hash,
  encodeFunctionData,
  stringToBytes,
  pad
} from 'viem';
import { sepolia } from 'viem/chains';
import EthereumDIDRegistryABI from '../abi/EthereumDIDRegistry.json';
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { privateKeyToAccount } from 'viem/accounts';
import { EthrDID } from 'ethr-did';
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { DID_CONFIG, validateDIDConfig } from '../config/did.config';
import { ethers } from 'ethers';

@Injectable()
export class DidService {
  private readonly logger = new Logger(DidService.name);
  private readonly registryContractAddress: Hex;
  private readonly zerodevRpc: string;
  private resolver: Resolver;

  constructor(private readonly walletService: WalletService) {
    // 設定の妥当性をチェック
    validateDIDConfig();

    // 環境変数から設定を取得
    this.registryContractAddress = DID_CONFIG.REGISTRY_CONTRACT_ADDRESS as Hex;
    this.zerodevRpc = DID_CONFIG.ZERODEV_RPC as string;

    // DID Resolverの設定
    this.setupResolver();

    this.logger.log('DID Service initialized successfully');
  }

  /**
   * DID Resolverのセットアップ
   */
  private setupResolver(): void {
    try {
      // Ethers Providerの作成（ethr-did-resolverで使用）
      const provider = new ethers.JsonRpcProvider(this.zerodevRpc);

      // リゾルバーの設定
      const resolverConfig = {
        networks: [
          {
            name: DID_CONFIG.CHAIN.NAME,
            provider: provider,
            registry: this.registryContractAddress,
            chainId: DID_CONFIG.CHAIN.ID,
          }
        ]
      };

      const ethrResolver = getEthrResolver(resolverConfig);
      this.resolver = new Resolver(ethrResolver);

      this.logger.log(`DID Resolver setup completed for chain: ${DID_CONFIG.CHAIN.NAME} (${DID_CONFIG.CHAIN.ID})`);
    } catch (error) {
      this.logger.error('Failed to setup DID Resolver:', error);
      throw error;
    }
  }

  /**
   * 新しいDIDを作成する
   * @param walletId ウォレットID
   * @returns DID文字列
   */
  async createDID(walletId: string): Promise<string> {
    try {
      // ウォレット情報を取得
      const wallet = await this.walletService.getWalletByAddress(walletId);
      if (!wallet) {
        throw new Error(`Wallet not found: ${walletId}`);
      }

      // DID文字列を生成（ERC1056形式）
      const did = `did:ethr:${DID_CONFIG.CHAIN.NAME}:${wallet.walletAddress}`;

      this.logger.log(`Created DID: ${did}`);
      return did;
    } catch (error) {
      this.logger.error(`Error in createDID: ${error.message}`);
      throw error;
    }
  }

  /**
   * DIDドキュメントを解決する
   * @param did DID文字列
   * @returns DIDドキュメント
   */
  async resolveDID(did: string): Promise<any> {
    try {
      const resolution = await this.resolver.resolve(did);

      if (resolution.didResolutionMetadata.error) {
        throw new Error(`DID resolution failed: ${resolution.didResolutionMetadata.error}`);
      }

      this.logger.log(`Resolved DID: ${did}`);
      return resolution;
    } catch (error) {
      this.logger.error(`Error in resolveDID: ${error.message}`);
      throw error;
    }
  }

  /**
   * DID情報を取得する
   * @param did DID文字列
   * @returns DID情報
   */
  async getDIDInfo(did: string): Promise<{
    id: string;
    document: any;
    metadata: any
  }> {
    try {
      const resolution = await this.resolveDID(did);

      return {
        id: resolution.didDocument?.id || did,
        document: resolution.didDocument,
        metadata: resolution.didResolutionMetadata,
      };
    } catch (error) {
      this.logger.error(`Error in getDIDInfo: ${error.message}`);
      throw error;
    }
  }

  /**
   * ZeroDevを使用して属性を設定する（ガス代不要）
   * @param walletId ウォレットID
   * @param key 属性キー
   * @param value 属性値
   * @param validity 有効期限（秒）
   * @returns トランザクションハッシュ
   */
  async setAttributeWithoutGas(
    walletId: string,
    key: string,
    value: string,
    validity: number = DID_CONFIG.DEFAULT_VALIDITY.ONE_YEAR,
  ): Promise<Hash> {
    try {

      // ウォレット情報の取得
      const wallet = await this.walletService.getWalletByAddress(walletId);
      if (!wallet) {
        throw new Error(`Wallet not found: ${walletId}`);
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

      // setAttribute関数の呼び出し用のデータをエンコード
      const setAttributeData = await account.encodeCalls([
        {
          to: this.registryContractAddress,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: EthereumDIDRegistryABI.abi,
            functionName: 'setAttribute',
            args: [
              wallet.walletAddress as Hex, // identity
              ethers.encodeBytes32String(key), // name
              ethers.hexlify(ethers.toUtf8Bytes(value)) as Hex, // value - UTF-8バイト配列をHex文字列に変換
              BigInt(validity),            // validity
            ],
          }),
        },
      ]);

      // UserOperationを送信
      const userOpHash = await kernelClient.sendUserOperation({
        callData: setAttributeData,
      });

      this.logger.log(`Set attribute without gas initiated: ${userOpHash}`);

      // トランザクションの完了を待つ
      const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      this.logger.log(`Set attribute without gas completed:`);
      this.logger.log(`  - UserOp Hash: ${userOpHash}`);
      this.logger.log(`  - Transaction Hash: ${receipt.receipt.transactionHash}`);
      this.logger.log(`  - Block Number: ${receipt.receipt.blockNumber}`);
      this.logger.log(`  - From: ${receipt.receipt.from}`);
      this.logger.log(`  - To: ${receipt.receipt.to}`);
      this.logger.log(`  - Gas Used: ${receipt.receipt.gasUsed}`);
      return receipt.receipt.transactionHash;
    } catch (error) {
      this.logger.error(`Error in setAttributeWithoutGas: ${error.message}`);
      throw error;
    }
  }

  /**
   * ZeroDevを使用してデリゲートを追加する（ガス代不要）
   * @param walletId ウォレットID
   * @param delegateType デリゲートタイプ
   * @param delegateAddress デリゲートアドレス
   * @param validity 有効期限（秒）
   * @returns トランザクションハッシュ
   */
  async addDelegateWithoutGas(
    walletId: string,
    delegateType: string,
    delegateAddress: string,
    validity: number = DID_CONFIG.DEFAULT_VALIDITY.ONE_YEAR,
  ): Promise<Hash> {
    try {

      // ウォレット情報の取得
      const wallet = await this.walletService.getWalletByAddress(walletId);
      if (!wallet) {
        throw new Error(`Wallet not found: ${walletId}`);
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

      // addDelegate関数の呼び出し用のデータをエンコード
      const addDelegateData = await account.encodeCalls([
        {
          to: this.registryContractAddress,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: EthereumDIDRegistryABI.abi,
            functionName: 'addDelegate',
            args: [
              wallet.walletAddress as Hex,      // identity
              ethers.encodeBytes32String(delegateType), // delegateType
              delegateAddress as Hex,           // delegate
              BigInt(validity),                 // validity
            ],
          }),
        },
      ]);

      // UserOperationを送信
      const userOpHash = await kernelClient.sendUserOperation({
        callData: addDelegateData,
      });

      this.logger.log(`Add delegate without gas initiated: ${userOpHash}`);

      // トランザクションの完了を待つ
      const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      this.logger.log(`Add delegate without gas completed: ${receipt.receipt.transactionHash}`);
      return receipt.receipt.transactionHash;
    } catch (error) {
      this.logger.error(`Error in addDelegateWithoutGas: ${error.message}`);
      throw error;
    }
  }

  /**
   * ZeroDevを使用してデリゲートを削除する（ガス代不要）
   * @param walletId ウォレットID
   * @param delegateType デリゲートタイプ
   * @param delegateAddress デリゲートアドレス
   * @returns トランザクションハッシュ
   */
  async revokeDelegateWithoutGas(
    walletId: string,
    delegateType: string,
    delegateAddress: string,
  ): Promise<Hash> {
    try {

      // ウォレット情報の取得
      const wallet = await this.walletService.getWalletByAddress(walletId);
      if (!wallet) {
        throw new Error(`Wallet not found: ${walletId}`);
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

      // revokeDelegate関数の呼び出し用のデータをエンコード
      const revokeDelegateData = await account.encodeCalls([
        {
          to: this.registryContractAddress,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: EthereumDIDRegistryABI.abi,
            functionName: 'revokeDelegate',
            args: [
              wallet.walletAddress as Hex,      // identity
              ethers.encodeBytes32String(delegateType), // delegateType
              delegateAddress as Hex,           // delegate
            ],
          }),
        },
      ]);

      // UserOperationを送信
      const userOpHash = await kernelClient.sendUserOperation({
        callData: revokeDelegateData,
      });

      this.logger.log(`Revoke delegate without gas initiated: ${userOpHash}`);

      // トランザクションの完了を待つ
      const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      this.logger.log(`Revoke delegate without gas completed: ${receipt.receipt.transactionHash}`);
      return receipt.receipt.transactionHash;
    } catch (error) {
      this.logger.error(`Error in revokeDelegateWithoutGas: ${error.message}`);
      throw error;
    }
  }

  /**
   * サービス属性を設定するヘルパーメソッド
   * @param walletId ウォレットID
   * @param serviceName サービス名
   * @param serviceEndpoint サービスエンドポイント
   * @param validity 有効期限（秒）
   * @returns トランザクションハッシュ
   */
  async setServiceAttribute(
    walletId: string,
    serviceName: string,
    serviceEndpoint: string,
    validity: number = DID_CONFIG.DEFAULT_VALIDITY.ONE_YEAR,
  ): Promise<Hash> {
    const key = `${DID_CONFIG.ATTRIBUTE_KEYS.SERVICE}${serviceName}`;
    const value = JSON.stringify({
      type: serviceName,
      serviceEndpoint,
    });

    this.logger.log(`Setting service attribute:`);
    this.logger.log(`  - Service Name: ${serviceName}`);
    this.logger.log(`  - Key: ${key}`);
    this.logger.log(`  - Value: ${value}`);
    this.logger.log(`  - Validity: ${validity} seconds`);

    return this.setAttributeWithoutGas(walletId, key, value, validity);
  }

  /**
   * 公開鍵属性を設定するヘルパーメソッド
   * @param walletId ウォレットID
   * @param keyType 鍵タイプ（例: Ed25519）
   * @param keyPurpose 鍵の用途（例: veriKey）
   * @param encoding エンコーディング（例: base64）
   * @param publicKey 公開鍵
   * @param validity 有効期限（秒）
   * @returns トランザクションハッシュ
   */
  async setPublicKeyAttribute(
    walletId: string,
    keyType: string,
    keyPurpose: string,
    encoding: string,
    publicKey: string,
    validity: number = DID_CONFIG.DEFAULT_VALIDITY.ONE_YEAR,
  ): Promise<Hash> {
    const key = `${DID_CONFIG.ATTRIBUTE_KEYS.PUBLIC_KEY}${keyType}/${keyPurpose}/${encoding}`;
    return this.setAttributeWithoutGas(walletId, key, publicKey, validity);
  }

  /**
   * VCのためのDIDを作成する（CredentialRepositoryとRevocationServiceを含む）
   * @param walletId ウォレットID
   * @returns VCのためのDID作成結果
   */
  async createDIDForVC(walletId: string): Promise<{
    did: string;
    didDocument: any;
    transactions: {
      credentialRepository: string;
      revocationService: string;
      universalResolver: string;
    };
    vcServices: {
      credentialRepository: string;
      revocationService: string;
      universalResolver: string;
    };
    walletAddress: string;
    chainName: string;
  }> {
    try {
      this.logger.log(`Creating DID for VC for wallet: ${walletId}`);

      // 1. 基本DIDを作成
      const did = await this.createDID(walletId);

      // 2. ウォレット情報を取得
      const wallet = await this.walletService.getWalletByAddress(walletId);
      if (!wallet) {
        throw new Error(`Wallet not found: ${walletId}`);
      }

      // 3. CredentialRepositoryサービスを追加（実質無期限）
      const credentialRepoTx = await this.setServiceAttribute(
        walletId,
        'CredentialRepository',
        DID_CONFIG.VC_SERVICES.CREDENTIAL_REPOSITORY,
        DID_CONFIG.DEFAULT_VALIDITY.PRACTICALLY_INFINITE,
      );

      // 4. RevocationServiceを追加（実質無期限）
      const revocationTx = await this.setServiceAttribute(
        walletId,
        'RevocationService',
        DID_CONFIG.VC_SERVICES.REVOCATION_SERVICE,
        DID_CONFIG.DEFAULT_VALIDITY.PRACTICALLY_INFINITE,
      );

      // 5. UniversalResolverを追加（他社システムでの検証用）
      const resolverConfig = JSON.stringify({
        endpoint: DID_CONFIG.UNIVERSAL_RESOLVER.ENDPOINT,
        supportedMethods: DID_CONFIG.UNIVERSAL_RESOLVER.SUPPORTED_METHODS,
        ethrConfig: {
          network: DID_CONFIG.UNIVERSAL_RESOLVER.ETHR_CONFIG.NETWORK,
          chainId: DID_CONFIG.UNIVERSAL_RESOLVER.ETHR_CONFIG.CHAIN_ID,
          registry: DID_CONFIG.UNIVERSAL_RESOLVER.ETHR_CONFIG.REGISTRY,
          rpcUrl: DID_CONFIG.UNIVERSAL_RESOLVER.ETHR_CONFIG.RPC_URL,
        }
      });

      const universalResolverTx = await this.setServiceAttribute(
        walletId,
        'UniversalResolver',
        resolverConfig,
        DID_CONFIG.DEFAULT_VALIDITY.PRACTICALLY_INFINITE,
      );

      this.logger.log(`VC services set for DID: ${did}`);
      this.logger.log(`CredentialRepository tx: ${credentialRepoTx}`);
      this.logger.log(`RevocationService tx: ${revocationTx}`);
      this.logger.log(`UniversalResolver tx: ${universalResolverTx}`);

      // 6. トランザクションの完了を待つ
      await this.waitForTransactions([credentialRepoTx, revocationTx, universalResolverTx]);

      // 7. 完全なDIDドキュメントを解決
      this.logger.log(`Resolving DID document after service additions: ${did}`);
      const resolution = await this.resolveDID(did);

      // サービスが正しく追加されているかチェック
      const services = resolution.didDocument?.service || [];
      this.logger.log(`DID document services count: ${services.length}`);
      services.forEach((service: any, index: number) => {
        this.logger.log(`  Service ${index + 1}: ${service.type} - ${service.serviceEndpoint}`);
      });

      const result = {
        did,
        didDocument: resolution.didDocument,
        transactions: {
          credentialRepository: credentialRepoTx,
          revocationService: revocationTx,
          universalResolver: universalResolverTx,
        },
        vcServices: {
          credentialRepository: DID_CONFIG.VC_SERVICES.CREDENTIAL_REPOSITORY,
          revocationService: DID_CONFIG.VC_SERVICES.REVOCATION_SERVICE,
          universalResolver: DID_CONFIG.UNIVERSAL_RESOLVER.ENDPOINT,
        },
        walletAddress: wallet.walletAddress,
        chainName: DID_CONFIG.CHAIN.NAME,
      };

      this.logger.log(`DID for VC created successfully: ${did}`);
      return result;
    } catch (error) {
      this.logger.error(`Error in createDIDForVC: ${error.message}`);
      throw error;
    }
  }

  /**
   * 複数のトランザクションの完了を待つヘルパーメソッド
   * @param transactionHashes トランザクションハッシュの配列
   * @param maxWaitTime 最大待機時間（ミリ秒）
   */
  private async waitForTransactions(
    transactionHashes: string[],
    maxWaitTime: number = 30000, // 30秒
  ): Promise<void> {
    this.logger.log(`Waiting for ${transactionHashes.length} transactions to complete...`);

    // 各トランザクションハッシュをログ出力
    transactionHashes.forEach((hash, index) => {
      this.logger.log(`  Transaction ${index + 1}: ${hash}`);
    });

    // より長い待機時間を設定（トランザクションの確定を待つ）
    await new Promise(resolve => setTimeout(resolve, 15000)); // 15秒待機

    this.logger.log('Transaction wait completed');
  }
} 