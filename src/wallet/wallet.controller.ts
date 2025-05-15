import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateWalletDto, WalletResponseDto, CreateWalletResponseDto } from './dto';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Post()
  @ApiOperation({ summary: '新しいウォレットを作成' })
  @ApiResponse({ status: 201, description: 'ウォレットが正常に作成されました', type: CreateWalletResponseDto })
  @ApiResponse({ status: 400, description: 'リクエストが無効です' })
  async createWallet(@Body() createWalletDto: CreateWalletDto): Promise<CreateWalletResponseDto> {
    try {
      const result = await this.walletService.createWallet(
        createWalletDto.userId,
        createWalletDto.privateKey,
        createWalletDto.chainId,
      );
      return {
        success: true,
        walletId: result.id,
        walletAddress: result.walletAddress,
      };
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'ウォレットの作成に失敗しました',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':userId/:chainId')
  @ApiOperation({ summary: 'ユーザーIDとチェーンIDでウォレットを取得' })
  @ApiParam({ name: 'userId', description: 'ユーザーID' })
  @ApiParam({ name: 'chainId', description: 'チェーンID' })
  @ApiResponse({ status: 200, description: 'ウォレット情報', type: WalletResponseDto })
  @ApiResponse({ status: 404, description: 'ウォレットが見つかりません' })
  async getWallet(@Param('userId') userId: string, @Param('chainId') chainId: string): Promise<WalletResponseDto> {
    try {
      const wallet = await this.walletService.getWalletByUserId(userId, parseInt(chainId, 10));
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