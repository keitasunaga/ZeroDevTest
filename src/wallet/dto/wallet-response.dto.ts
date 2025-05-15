import { ApiProperty } from '@nestjs/swagger';

export class WalletResponseDto {
  @ApiProperty({ description: 'ウォレットID' })
  id: string;

  @ApiProperty({ description: 'ユーザーID' })
  userId: string;

  @ApiProperty({ description: 'ウォレットアドレス' })
  walletAddress: string;

  @ApiProperty({ description: 'チェーンID' })
  chainId: number;

  @ApiProperty({ description: 'ウォレットタイプ' })
  walletType: string;

  @ApiProperty({ description: '作成日時' })
  createdAt: Date;
} 