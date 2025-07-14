import { ApiProperty } from '@nestjs/swagger';

/**
 * VCのためのDID作成レスポンスDTO
 */
export class CreateDIDForVCResponseDto {
  @ApiProperty({
    description: '作成されたDID',
    example: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890',
  })
  did: string;

  @ApiProperty({
    description: '完全なDIDドキュメント（VCサービス属性付き）',
    example: {
      id: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890',
      verificationMethod: [
        {
          id: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890#controller',
          type: 'EcdsaSecp256k1RecoveryMethod2020',
          controller: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890',
          blockchainAccountId: 'eip155:11155111:0x1234567890123456789012345678901234567890'
        }
      ],
      authentication: ['did:ethr:sepolia:0x1234567890123456789012345678901234567890#controller'],
      assertionMethod: ['did:ethr:sepolia:0x1234567890123456789012345678901234567890#controller'],
      service: [
        {
          id: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890#CredentialRepository',
          type: 'CredentialRepository',
          serviceEndpoint: 'https://credentials.example.com/api/v1'
        },
        {
          id: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890#RevocationService',
          type: 'RevocationService',
          serviceEndpoint: 'https://revocation.example.com/status-list/v1'
        }
      ]
    },
  })
  didDocument: any;

  @ApiProperty({
    description: 'トランザクションハッシュ',
    type: 'object',
    properties: {
      credentialRepository: {
        type: 'string',
        description: 'CredentialRepositoryサービス設定のトランザクションハッシュ',
      },
      revocationService: {
        type: 'string',
        description: 'RevocationServiceサービス設定のトランザクションハッシュ',
      },
      universalResolver: {
        type: 'string',
        description: 'UniversalResolverサービス設定のトランザクションハッシュ',
      },
    },
  })
  transactions: {
    credentialRepository: string;
    revocationService: string;
    universalResolver: string;
  };

  @ApiProperty({
    description: '設定されたVCサービス',
    type: 'object',
    properties: {
      credentialRepository: {
        type: 'string',
        description: 'CredentialRepositoryのエンドポイント',
      },
      revocationService: {
        type: 'string',
        description: 'RevocationServiceのエンドポイント',
      },
      universalResolver: {
        type: 'string',
        description: 'UniversalResolverのエンドポイント',
      },
    },
  })
  vcServices: {
    credentialRepository: string;
    revocationService: string;
    universalResolver: string;
  };

  @ApiProperty({
    description: 'ウォレットアドレス',
    example: '0x1234567890123456789012345678901234567890',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'チェーン名',
    example: 'sepolia',
  })
  chainName: string;
} 