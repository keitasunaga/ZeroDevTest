import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletResponseDto {
  @ApiProperty({ description: '処理成功フラグ' })
  success: boolean;

  @ApiProperty({ description: 'ウォレットID' })
  walletId: string;

  @ApiProperty({ description: 'ウォレットアドレス' })
  walletAddress: string;
} 