import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import {
  WalletResponseDto,
  CreateWalletResponseDto,
  CreateZeroDevWalletDto,
  RecoverWalletDto
} from './dto';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  // SepoliaテストネットのチェーンID (固定値)
  private readonly SEPOLIA_CHAIN_ID = 11155111;

  @Post('zerodev')
  @ApiOperation({ summary: '新しいZeroDevスマートアカウントを作成してデプロイする' })
  @ApiResponse({ status: 201, description: 'ZeroDevウォレットが正常に作成・デプロイされました', type: CreateWalletResponseDto })
  @ApiResponse({ status: 400, description: 'リクエストが無効です' })
  async createZeroDevWallet(@Body() createZeroDevWalletDto: CreateZeroDevWalletDto): Promise<CreateWalletResponseDto> {
    try {
      // ウォレットを作成し、同時にデプロイする
      const result = await this.walletService.createAndDeployZeroDevWallet(
        createZeroDevWalletDto.userId,
        this.SEPOLIA_CHAIN_ID, // chainIdを固定値に変更
      );
      return {
        success: true,
        walletId: result.id,
        walletAddress: result.walletAddress,
      };
    } catch (error) {
      if (error.message.includes('ZERODEV_RPC環境変数')) {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: '環境変数が適切に設定されていません',
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'ZeroDevウォレットの作成・デプロイに失敗しました',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('zerodev/recover')
  @ApiOperation({ summary: '既存のZeroDevスマートアカウントを復元' })
  @ApiResponse({ status: 200, description: 'ZeroDevウォレットが正常に復元されました', type: WalletResponseDto })
  @ApiResponse({ status: 400, description: 'リクエストが無効です' })
  @ApiResponse({ status: 404, description: 'ウォレットが見つかりません' })
  async recoverZeroDevWallet(@Body() recoverWalletDto: RecoverWalletDto): Promise<WalletResponseDto> {
    try {
      const wallet = await this.walletService.recoverZeroDevWallet(recoverWalletDto.walletId);
      return {
        id: wallet.id,
        userId: wallet.userId,
        walletAddress: wallet.walletAddress,
        chainId: wallet.chainId,
        walletType: wallet.walletType,
        createdAt: wallet.createdAt,
      };
    } catch (error) {
      if (error.message.includes('見つかりません')) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: error.message,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      if (error.message.includes('ZERODEV_RPC環境変数')) {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: '環境変数が適切に設定されていません',
            message: error.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'ZeroDevウォレットの復元に失敗しました',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':userId')
  @ApiOperation({ summary: 'ユーザーIDでウォレットを取得' })
  @ApiParam({ name: 'userId', description: 'ユーザーID' })
  @ApiResponse({ status: 200, description: 'ウォレット情報', type: WalletResponseDto })
  @ApiResponse({ status: 404, description: 'ウォレットが見つかりません' })
  async getWallet(@Param('userId') userId: string): Promise<WalletResponseDto> {
    try {
      const wallet = await this.walletService.getWalletByUserId(userId, this.SEPOLIA_CHAIN_ID);
      if (!wallet) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'ウォレットが見つかりません',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        id: wallet.id,
        userId: wallet.userId,
        walletAddress: wallet.walletAddress,
        chainId: wallet.chainId,
        walletType: wallet.walletType,
        createdAt: wallet.createdAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'ウォレット情報の取得に失敗しました',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('address/:walletAddress')
  @ApiOperation({ summary: 'ウォレットアドレスからウォレットを取得' })
  @ApiParam({ name: 'walletAddress', description: 'ウォレットアドレス' })
  @ApiResponse({ status: 200, description: 'ウォレット情報', type: WalletResponseDto })
  @ApiResponse({ status: 404, description: 'ウォレットが見つかりません' })
  async getWalletByAddress(@Param('walletAddress') walletAddress: string): Promise<WalletResponseDto> {
    try {
      const wallet = await this.walletService.getWalletByAddress(walletAddress);
      if (!wallet) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'ウォレットが見つかりません',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        id: wallet.id,
        userId: wallet.userId,
        walletAddress: wallet.walletAddress,
        chainId: wallet.chainId,
        walletType: wallet.walletType,
        createdAt: wallet.createdAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'ウォレット情報の取得に失敗しました',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 