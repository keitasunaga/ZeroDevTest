import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DidService } from './did.service';
import { DID_CONFIG } from '../config/did.config';

// DTOのインポート
import {
  CreateDidDto,
  CreateDidResponseDto,
} from './dto/create-did.dto';
import {
  SetAttributeDto,
  SetServiceAttributeDto,
  SetPublicKeyAttributeDto,
  SetAttributeResponseDto,
} from './dto/set-attribute.dto';
import {
  AddDelegateDto,
  RevokeDelegateDto,
  DelegateResponseDto,
} from './dto/add-delegate.dto';
import {
  ResolveDIDResponseDto,
  DIDInfoResponseDto,
} from './dto/resolve-did.dto';
import {
  CreateDIDForVCResponseDto,
} from './dto/create-did-for-vc.dto';

@ApiTags('DID')
@Controller('did')
export class DidController {
  private readonly logger = new Logger(DidController.name);

  constructor(private readonly didService: DidService) { }

  @Post('create')
  @ApiOperation({ summary: 'DIDを作成する' })
  @ApiResponse({
    status: 201,
    description: 'DIDが正常に作成されました',
    type: CreateDidResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'リクエストが無効です',
  })
  @ApiResponse({
    status: 404,
    description: 'ウォレットが見つかりません',
  })
  async createDID(@Body() createDidDto: CreateDidDto): Promise<CreateDidResponseDto> {
    try {
      this.logger.log(`Creating DID for wallet: ${createDidDto.walletId}`);

      const did = await this.didService.createDID(createDidDto.walletId);

      // ウォレット情報を取得してレスポンスに含める
      const wallet = await this.didService['walletService'].getWalletByAddress(createDidDto.walletId);
      if (!wallet) {
        throw new Error(`Wallet not found: ${createDidDto.walletId}`);
      }

      const response: CreateDidResponseDto = {
        did,
        walletAddress: wallet.walletAddress,
        chainName: DID_CONFIG.CHAIN.NAME,
      };

      this.logger.log(`DID created successfully: ${did}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to create DID: ${error.message}`);
      throw new HttpException(
        `DID作成に失敗しました: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':didId')
  @ApiOperation({ summary: 'DIDを解決する' })
  @ApiParam({
    name: 'didId',
    description: 'DID文字列（フルDIDまたはアドレス部分のみ）',
    example: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'DIDが正常に解決されました',
    type: ResolveDIDResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'DIDが見つかりません',
  })
  async resolveDID(@Param('didId') didId: string): Promise<ResolveDIDResponseDto> {
    try {
      this.logger.log(`Resolving DID: ${didId}`);

      // DID形式でない場合は、DID形式に変換
      let fullDID = didId;
      if (!didId.startsWith('did:')) {
        fullDID = `did:ethr:${DID_CONFIG.CHAIN.NAME}:${didId}`;
      }

      const resolution = await this.didService.resolveDID(fullDID);

      const response: ResolveDIDResponseDto = {
        didResolution: resolution,
        didDocument: resolution.didDocument,
        didResolutionMetadata: resolution.didResolutionMetadata,
      };

      this.logger.log(`DID resolved successfully: ${fullDID}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to resolve DID: ${error.message}`);
      throw new HttpException(
        `DID解決に失敗しました: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get(':didId/info')
  @ApiOperation({ summary: 'DID情報を取得する' })
  @ApiParam({
    name: 'didId',
    description: 'DID文字列（フルDIDまたはアドレス部分のみ）',
    example: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'DID情報が正常に取得されました',
    type: DIDInfoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'DIDが見つかりません',
  })
  async getDIDInfo(@Param('didId') didId: string): Promise<DIDInfoResponseDto> {
    try {
      this.logger.log(`Getting DID info: ${didId}`);

      // DID形式でない場合は、DID形式に変換
      let fullDID = didId;
      if (!didId.startsWith('did:')) {
        fullDID = `did:ethr:${DID_CONFIG.CHAIN.NAME}:${didId}`;
      }

      const didInfo = await this.didService.getDIDInfo(fullDID);

      this.logger.log(`DID info retrieved successfully: ${fullDID}`);
      return didInfo;
    } catch (error) {
      this.logger.error(`Failed to get DID info: ${error.message}`);
      throw new HttpException(
        `DID情報取得に失敗しました: ${error.message}`,
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post(':walletId/attribute')
  @ApiOperation({ summary: 'DID属性を設定する（ガス代不要）' })
  @ApiParam({
    name: 'walletId',
    description: 'ウォレットID',
    example: 'wallet_12345',
  })
  @ApiResponse({
    status: 201,
    description: '属性が正常に設定されました',
    type: SetAttributeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'リクエストが無効です',
  })
  @ApiResponse({
    status: 404,
    description: 'ウォレットが見つかりません',
  })
  async setAttribute(
    @Param('walletId') walletId: string,
    @Body() setAttributeDto: SetAttributeDto,
  ): Promise<SetAttributeResponseDto> {
    try {
      this.logger.log(`Setting attribute for wallet: ${walletId}`);

      const validity = setAttributeDto.validity || DID_CONFIG.DEFAULT_VALIDITY.ONE_YEAR;

      const transactionHash = await this.didService.setAttributeWithoutGas(
        walletId,
        setAttributeDto.key,
        setAttributeDto.value,
        validity,
      );

      const response: SetAttributeResponseDto = {
        transactionHash,
        key: setAttributeDto.key,
        value: setAttributeDto.value,
        validity,
      };

      this.logger.log(`Attribute set successfully: ${transactionHash}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to set attribute: ${error.message}`);
      throw new HttpException(
        `属性設定に失敗しました: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':walletId/attribute/service')
  @ApiOperation({ summary: 'サービス属性を設定する（ガス代不要）' })
  @ApiParam({
    name: 'walletId',
    description: 'ウォレットID',
    example: 'wallet_12345',
  })
  @ApiResponse({
    status: 201,
    description: 'サービス属性が正常に設定されました',
    type: SetAttributeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'リクエストが無効です',
  })
  @ApiResponse({
    status: 404,
    description: 'ウォレットが見つかりません',
  })
  async setServiceAttribute(
    @Param('walletId') walletId: string,
    @Body() setServiceAttributeDto: SetServiceAttributeDto,
  ): Promise<SetAttributeResponseDto> {
    try {
      this.logger.log(`Setting service attribute for wallet: ${walletId}`);

      const validity = setServiceAttributeDto.validity || DID_CONFIG.DEFAULT_VALIDITY.ONE_YEAR;

      const transactionHash = await this.didService.setServiceAttribute(
        walletId,
        setServiceAttributeDto.serviceName,
        setServiceAttributeDto.serviceEndpoint,
        validity,
      );

      const key = `${DID_CONFIG.ATTRIBUTE_KEYS.SERVICE}${setServiceAttributeDto.serviceName}`;
      const value = JSON.stringify({
        type: setServiceAttributeDto.serviceName,
        serviceEndpoint: setServiceAttributeDto.serviceEndpoint,
      });

      const response: SetAttributeResponseDto = {
        transactionHash,
        key,
        value,
        validity,
      };

      this.logger.log(`Service attribute set successfully: ${transactionHash}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to set service attribute: ${error.message}`);
      throw new HttpException(
        `サービス属性設定に失敗しました: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':walletId/attribute/publickey')
  @ApiOperation({ summary: '公開鍵属性を設定する（ガス代不要）' })
  @ApiParam({
    name: 'walletId',
    description: 'ウォレットID',
    example: 'wallet_12345',
  })
  @ApiResponse({
    status: 201,
    description: '公開鍵属性が正常に設定されました',
    type: SetAttributeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'リクエストが無効です',
  })
  @ApiResponse({
    status: 404,
    description: 'ウォレットが見つかりません',
  })
  async setPublicKeyAttribute(
    @Param('walletId') walletId: string,
    @Body() setPublicKeyAttributeDto: SetPublicKeyAttributeDto,
  ): Promise<SetAttributeResponseDto> {
    try {
      this.logger.log(`Setting public key attribute for wallet: ${walletId}`);

      const validity = setPublicKeyAttributeDto.validity || DID_CONFIG.DEFAULT_VALIDITY.ONE_YEAR;

      const transactionHash = await this.didService.setPublicKeyAttribute(
        walletId,
        setPublicKeyAttributeDto.keyType,
        setPublicKeyAttributeDto.keyPurpose,
        setPublicKeyAttributeDto.encoding,
        setPublicKeyAttributeDto.publicKey,
        validity,
      );

      const key = `${DID_CONFIG.ATTRIBUTE_KEYS.PUBLIC_KEY}${setPublicKeyAttributeDto.keyType}/${setPublicKeyAttributeDto.keyPurpose}/${setPublicKeyAttributeDto.encoding}`;

      const response: SetAttributeResponseDto = {
        transactionHash,
        key,
        value: setPublicKeyAttributeDto.publicKey,
        validity,
      };

      this.logger.log(`Public key attribute set successfully: ${transactionHash}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to set public key attribute: ${error.message}`);
      throw new HttpException(
        `公開鍵属性設定に失敗しました: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':walletId/delegate')
  @ApiOperation({ summary: 'デリゲートを追加する（ガス代不要）' })
  @ApiParam({
    name: 'walletId',
    description: 'ウォレットID',
    example: 'wallet_12345',
  })
  @ApiResponse({
    status: 201,
    description: 'デリゲートが正常に追加されました',
    type: DelegateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'リクエストが無効です',
  })
  @ApiResponse({
    status: 404,
    description: 'ウォレットが見つかりません',
  })
  async addDelegate(
    @Param('walletId') walletId: string,
    @Body() addDelegateDto: AddDelegateDto,
  ): Promise<DelegateResponseDto> {
    try {
      this.logger.log(`Adding delegate for wallet: ${walletId}`);

      const validity = addDelegateDto.validity || DID_CONFIG.DEFAULT_VALIDITY.ONE_YEAR;

      const transactionHash = await this.didService.addDelegateWithoutGas(
        walletId,
        addDelegateDto.delegateType,
        addDelegateDto.delegateAddress,
        validity,
      );

      const response: DelegateResponseDto = {
        transactionHash,
        delegateType: addDelegateDto.delegateType,
        delegateAddress: addDelegateDto.delegateAddress,
        validity,
      };

      this.logger.log(`Delegate added successfully: ${transactionHash}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to add delegate: ${error.message}`);
      throw new HttpException(
        `デリゲート追加に失敗しました: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':walletId/delegate')
  @ApiOperation({ summary: 'デリゲートを削除する（ガス代不要）' })
  @ApiParam({
    name: 'walletId',
    description: 'ウォレットID',
    example: 'wallet_12345',
  })
  @ApiResponse({
    status: 200,
    description: 'デリゲートが正常に削除されました',
    type: DelegateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'リクエストが無効です',
  })
  @ApiResponse({
    status: 404,
    description: 'ウォレットが見つかりません',
  })
  async revokeDelegate(
    @Param('walletId') walletId: string,
    @Body() revokeDelegateDto: RevokeDelegateDto,
  ): Promise<DelegateResponseDto> {
    try {
      this.logger.log(`Revoking delegate for wallet: ${walletId}`);

      const transactionHash = await this.didService.revokeDelegateWithoutGas(
        walletId,
        revokeDelegateDto.delegateType,
        revokeDelegateDto.delegateAddress,
      );

      const response: DelegateResponseDto = {
        transactionHash,
        delegateType: revokeDelegateDto.delegateType,
        delegateAddress: revokeDelegateDto.delegateAddress,
      };

      this.logger.log(`Delegate revoked successfully: ${transactionHash}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to revoke delegate: ${error.message}`);
      throw new HttpException(
        `デリゲート削除に失敗しました: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':walletId/for-vc')
  @ApiOperation({ summary: 'VCのためのDIDを作成する（CredentialRepositoryとRevocationServiceを含む）' })
  @ApiParam({
    name: 'walletId',
    description: 'ウォレットID',
    example: 'wallet_12345',
  })
  @ApiResponse({
    status: 201,
    description: 'VCのためのDIDが正常に作成されました',
    type: CreateDIDForVCResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'リクエストが無効です',
  })
  @ApiResponse({
    status: 404,
    description: 'ウォレットが見つかりません',
  })
  async createDIDForVC(@Param('walletId') walletId: string): Promise<CreateDIDForVCResponseDto> {
    try {
      this.logger.log(`Creating DID for VC for wallet: ${walletId}`);

      const result = await this.didService.createDIDForVC(walletId);

      this.logger.log(`DID for VC created successfully: ${result.did}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create DID for VC: ${error.message}`);
      throw new HttpException(
        `VCのためのDID作成に失敗しました: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
} 