import { ApiProperty } from '@nestjs/swagger';

export class ResolveDIDResponseDto {
  @ApiProperty({
    description: 'DID解決結果',
    example: {
      didDocument: {
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
        service: []
      },
      didResolutionMetadata: {
        contentType: 'application/did+ld+json'
      },
      didDocumentMetadata: {}
    },
  })
  didResolution: any;

  @ApiProperty({
    description: 'DIDドキュメント',
    example: {
      id: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890',
      verificationMethod: [],
      authentication: [],
      assertionMethod: [],
      service: []
    },
  })
  didDocument: any;

  @ApiProperty({
    description: 'DID解決メタデータ',
    example: {
      contentType: 'application/did+ld+json'
    },
  })
  didResolutionMetadata: any;
}

export class DIDInfoResponseDto {
  @ApiProperty({
    description: 'DID',
    example: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890',
  })
  id: string;

  @ApiProperty({
    description: 'DIDドキュメント',
    example: {
      id: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890',
      verificationMethod: [],
      authentication: [],
      assertionMethod: [],
      service: []
    },
  })
  document: any;

  @ApiProperty({
    description: 'メタデータ',
    example: {
      contentType: 'application/did+ld+json'
    },
  })
  metadata: any;
} 