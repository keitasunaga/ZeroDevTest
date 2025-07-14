import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { DidService } from './did.service';

/**
 * Universal Resolver標準準拠のコントローラー
 * W3C DID Core仕様に基づくDID解決エンドポイントを提供
 */
@ApiTags('Universal Resolver')
@Controller()
export class UniversalResolverController {
  private readonly logger = new Logger(UniversalResolverController.name);

  constructor(private readonly didService: DidService) { }

  @Get('1.0/identifiers/:did')
  @ApiOperation({
    summary: 'Universal Resolver標準エンドポイント',
    description: 'W3C DID Core仕様に準拠したDID解決エンドポイント'
  })
  @ApiParam({
    name: 'did',
    description: 'DID文字列',
    example: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890',
  })
  @ApiQuery({
    name: 'versionId',
    description: 'DIDドキュメントのバージョンID',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'versionTime',
    description: 'DIDドキュメントのバージョン時刻',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'hl',
    description: 'ハッシュリンク',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'service',
    description: 'サービス選択',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'relativeRef',
    description: '相対参照',
    required: false,
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'DIDが正常に解決されました',
    schema: {
      type: 'object',
      properties: {
        didResolutionMetadata: {
          type: 'object',
          properties: {
            contentType: { type: 'string', example: 'application/did+ld+json' },
            pattern: { type: 'string' },
            driverUrl: { type: 'string' },
            duration: { type: 'number' },
            did: {
              type: 'object',
              properties: {
                didString: { type: 'string' },
                methodSpecificId: { type: 'string' },
                method: { type: 'string' }
              }
            }
          }
        },
        didDocument: {
          type: 'object',
          description: 'W3C DID Document'
        },
        didDocumentMetadata: {
          type: 'object',
          properties: {
            versionId: { type: 'string' },
            updated: { type: 'string' },
            deactivated: { type: 'boolean' },
            canonicalId: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'DIDが無効です',
    schema: {
      type: 'object',
      properties: {
        didResolutionMetadata: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'invalidDid' },
            errorMessage: { type: 'string' }
          }
        },
        didDocument: { type: 'null' },
        didDocumentMetadata: { type: 'object' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'DIDが見つかりません',
    schema: {
      type: 'object',
      properties: {
        didResolutionMetadata: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'notFound' },
            errorMessage: { type: 'string' }
          }
        },
        didDocument: { type: 'null' },
        didDocumentMetadata: { type: 'object' }
      }
    }
  })
  async resolveIdentifier(
    @Param('did') did: string,
    @Query('versionId') versionId?: string,
    @Query('versionTime') versionTime?: string,
    @Query('hl') hl?: string,
    @Query('service') service?: string,
    @Query('relativeRef') relativeRef?: string,
  ) {
    const startTime = Date.now();

    try {
      this.logger.log(`Universal Resolver: Resolving DID: ${did}`);

      // DID形式の検証
      if (!did.startsWith('did:')) {
        return this.createErrorResponse('invalidDid', `Invalid DID format: ${did}`, startTime);
      }

      // DIDメソッドの検証
      const didParts = did.split(':');
      if (didParts.length < 3) {
        return this.createErrorResponse('invalidDid', `Invalid DID structure: ${did}`, startTime);
      }

      const method = didParts[1];
      if (method !== 'ethr') {
        return this.createErrorResponse('methodNotSupported', `Method not supported: ${method}`, startTime);
      }

      // DID解決の実行
      const resolution = await this.didService.resolveDID(did);

      // Universal Resolver標準形式でレスポンスを構築
      const response = {
        didResolutionMetadata: {
          contentType: 'application/did+ld+json',
          pattern: '^did:ethr:.*',
          driverUrl: 'https://github.com/decentralized-identity/ethr-did-resolver',
          duration: Date.now() - startTime,
          did: {
            didString: did,
            methodSpecificId: didParts.slice(2).join(':'),
            method: method
          }
        },
        didDocument: resolution.didDocument,
        didDocumentMetadata: resolution.didDocumentMetadata || {}
      };

      this.logger.log(`Universal Resolver: DID resolved successfully: ${did} (${Date.now() - startTime}ms)`);
      return response;

    } catch (error) {
      this.logger.error(`Universal Resolver: Failed to resolve DID: ${did} - ${error.message}`);

      if (error.message.includes('not found') || error.message.includes('No DID Document')) {
        return this.createErrorResponse('notFound', `DID not found: ${did}`, startTime);
      }

      return this.createErrorResponse('internalError', `Internal error: ${error.message}`, startTime);
    }
  }

  @Get('1.0/methods')
  @ApiOperation({
    summary: 'サポートされているDIDメソッドの一覧',
    description: 'このUniversal ResolverがサポートするDIDメソッドの一覧を返します'
  })
  @ApiResponse({
    status: 200,
    description: 'サポートされているメソッドの一覧',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          method: { type: 'string', example: 'ethr' },
          description: { type: 'string' },
          networks: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    }
  })
  async getSupportedMethods() {
    return [
      {
        method: 'ethr',
        description: 'Ethereum DID method using ERC1056 registry',
        networks: ['sepolia', 'mainnet'],
        testIdentifiers: [
          'did:ethr:sepolia:0x1234567890123456789012345678901234567890'
        ]
      }
    ];
  }

  @Get('1.0/properties')
  @ApiOperation({
    summary: 'Universal Resolverのプロパティ',
    description: 'このUniversal Resolverの設定とプロパティを返します'
  })
  @ApiResponse({
    status: 200,
    description: 'Universal Resolverのプロパティ',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        supportedMethods: {
          type: 'array',
          items: { type: 'string' }
        },
        testIdentifiers: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  })
  async getProperties() {
    return {
      version: '1.0.0',
      supportedMethods: ['ethr'],
      testIdentifiers: [
        'did:ethr:sepolia:0x7995CEF89D4f5849AC3f1F2dC4e044eB167Aaa08'
      ],
      description: 'Universal Resolver for Ethereum DIDs',
      contact: 'admin@your-domain.com'
    };
  }

  /**
   * Universal Resolver標準のエラーレスポンスを作成
   */
  private createErrorResponse(error: string, errorMessage: string, startTime: number) {
    return {
      didResolutionMetadata: {
        error,
        errorMessage,
        duration: Date.now() - startTime
      },
      didDocument: null,
      didDocumentMetadata: {}
    };
  }
} 