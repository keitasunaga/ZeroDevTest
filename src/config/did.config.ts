/**
 * DID関連の設定定数
 * 環境変数から動的に設定を読み込み
 */

// デフォルト値の定義
const DEFAULT_VALUES = {
  CHAIN_NAME: 'sepolia',
  CHAIN_ID: 11155111,
  DEFAULT_VALIDITY_SECONDS: 365 * 24 * 60 * 60, // 1年
  SERVICE_ATTRIBUTE_PREFIX: 'did/svc/',
  PUBLIC_KEY_ATTRIBUTE_PREFIX: 'did/pub/',
  CREDENTIAL_REPOSITORY_ENDPOINT: 'https://credentials.example.com/api/v1',
  REVOCATION_SERVICE_ENDPOINT: 'https://revocation.example.com/status-list/v1',
  UNIVERSAL_RESOLVER_ENDPOINT: 'https://resolver.your-domain.com/1.0/identifiers/',
} as const;

export const DID_CONFIG = {
  // デフォルトの有効期限（秒）
  DEFAULT_VALIDITY: {
    ONE_DAY: 24 * 60 * 60,
    ONE_WEEK: 7 * 24 * 60 * 60,
    ONE_MONTH: 30 * 24 * 60 * 60,
    ONE_YEAR: parseInt(process.env.DID_DEFAULT_VALIDITY_SECONDS || DEFAULT_VALUES.DEFAULT_VALIDITY_SECONDS.toString()),
    PRACTICALLY_INFINITE: 100 * 365 * 24 * 60 * 60, // 100年（実質無期限）
  },

  // デリゲートタイプ（ERC1056標準なので固定）
  DELEGATE_TYPES: {
    SIG_AUTH: 'sigAuth',
    VER_KEY: 'veriKey',
  },

  // 属性キーのプレフィックス（環境変数で設定可能）
  ATTRIBUTE_KEYS: {
    SERVICE: process.env.DID_SERVICE_ATTRIBUTE_PREFIX || DEFAULT_VALUES.SERVICE_ATTRIBUTE_PREFIX,
    PUBLIC_KEY: process.env.DID_PUBLIC_KEY_ATTRIBUTE_PREFIX || DEFAULT_VALUES.PUBLIC_KEY_ATTRIBUTE_PREFIX,
  },

  // チェーン設定（環境変数で設定可能）
  CHAIN: {
    NAME: process.env.DID_CHAIN_NAME || DEFAULT_VALUES.CHAIN_NAME,
    ID: parseInt(process.env.DID_CHAIN_ID || DEFAULT_VALUES.CHAIN_ID.toString()),
  },

  // VCサービスのデフォルトエンドポイント（環境変数で設定可能）
  VC_SERVICES: {
    CREDENTIAL_REPOSITORY: process.env.DID_CREDENTIAL_REPOSITORY_ENDPOINT || DEFAULT_VALUES.CREDENTIAL_REPOSITORY_ENDPOINT,
    REVOCATION_SERVICE: process.env.DID_REVOCATION_SERVICE_ENDPOINT || DEFAULT_VALUES.REVOCATION_SERVICE_ENDPOINT,
  },

  // Universal Resolver設定（環境変数で設定可能）
  UNIVERSAL_RESOLVER: {
    ENDPOINT: process.env.DID_UNIVERSAL_RESOLVER_ENDPOINT || DEFAULT_VALUES.UNIVERSAL_RESOLVER_ENDPOINT,
    SUPPORTED_METHODS: ['ethr'], // 現在はethrのみサポート
    ETHR_CONFIG: {
      NETWORK: process.env.DID_CHAIN_NAME || DEFAULT_VALUES.CHAIN_NAME,
      CHAIN_ID: parseInt(process.env.DID_CHAIN_ID || DEFAULT_VALUES.CHAIN_ID.toString()),
      REGISTRY: process.env.DID_REGISTRY_CONTRACT_ADDRESS,
      RPC_URL: process.env.ZERODEV_RPC,
    },
  },

  // 環境変数から必須設定を取得
  REGISTRY_CONTRACT_ADDRESS: process.env.DID_REGISTRY_CONTRACT_ADDRESS,
  ZERODEV_RPC: process.env.ZERODEV_RPC,
} as const;

/**
 * 設定の妥当性をチェックする
 */
export function validateDIDConfig(): void {
  const missingVars: string[] = [];

  if (!DID_CONFIG.REGISTRY_CONTRACT_ADDRESS) {
    missingVars.push('DID_REGISTRY_CONTRACT_ADDRESS');
  }

  if (!DID_CONFIG.ZERODEV_RPC) {
    missingVars.push('ZERODEV_RPC');
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

/**
 * 設定情報をログ出力する（デバッグ用）
 */
export function logDIDConfig(): void {
  console.log('DID Configuration:');
  console.log(`  Chain: ${DID_CONFIG.CHAIN.NAME} (ID: ${DID_CONFIG.CHAIN.ID})`);
  console.log(`  Registry Contract: ${DID_CONFIG.REGISTRY_CONTRACT_ADDRESS}`);
  console.log(`  Default Validity: ${DID_CONFIG.DEFAULT_VALIDITY.ONE_YEAR} seconds`);
  console.log(`  Service Prefix: ${DID_CONFIG.ATTRIBUTE_KEYS.SERVICE}`);
  console.log(`  Public Key Prefix: ${DID_CONFIG.ATTRIBUTE_KEYS.PUBLIC_KEY}`);
} 