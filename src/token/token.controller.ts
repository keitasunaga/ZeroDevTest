import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TokenService } from './token.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

@ApiTags('token')
@Controller('token')
export class TokenController {
  constructor(private readonly tokenService: TokenService) { }

  @Get('balance/:walletId')
  @ApiOperation({ summary: 'トークンの残高を取得' })
  @ApiParam({ name: 'walletId', description: 'ウォレットアドレス' })
  @ApiResponse({ status: 200, description: 'トークンの残高', schema: { properties: { balance: { type: 'string' } } } })
  async getTokenBalance(@Param('walletId') walletId: string) {
    const balance = await this.tokenService.getTokenBalance(walletId);
    return {
      balance: balance.toString(),
    };
  }

  @Get('info')
  @ApiOperation({ summary: 'トークンの情報を取得' })
  @ApiResponse({ status: 200, description: 'トークンの情報', schema: { properties: { name: { type: 'string' }, symbol: { type: 'string' } } } })
  async getTokenInfo() {
    return this.tokenService.getTokenInfo();
  }

  @Post('transfer/with-gas')
  @ApiOperation({ summary: '通常のトランザクションでトークンを転送（ガス代が必要）' })
  @ApiBody({
    schema: {
      properties: {
        fromWalletId: { type: 'string', description: '送信元ウォレットアドレス' },
        toAddress: { type: 'string', description: '受信先アドレス' },
        amount: { type: 'string', description: '転送量（wei単位）' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'トランザクションハッシュ', schema: { properties: { transactionHash: { type: 'string' } } } })
  async transferTokenWithGas(
    @Body() body: { fromWalletId: string; toAddress: string; amount: string },
  ) {
    const hash = await this.tokenService.transferTokenWithGas(
      body.fromWalletId,
      body.toAddress,
      BigInt(body.amount),
    );
    return { transactionHash: hash };
  }

  @Post('transfer/without-gas')
  @ApiOperation({ summary: 'ZeroDevを使用してトークンを転送（ガス代不要）' })
  @ApiBody({
    schema: {
      properties: {
        fromWalletId: { type: 'string', description: '送信元ウォレットアドレス' },
        toAddress: { type: 'string', description: '受信先アドレス' },
        amount: { type: 'string', description: '転送量（wei単位）' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'トランザクションハッシュ', schema: { properties: { transactionHash: { type: 'string' } } } })
  async transferTokenWithoutGas(
    @Body() body: { fromWalletId: string; toAddress: string; amount: string },
  ) {
    const hash = await this.tokenService.transferTokenWithoutGas(
      body.fromWalletId,
      body.toAddress,
      BigInt(body.amount),
    );
    return { transactionHash: hash };
  }
} 