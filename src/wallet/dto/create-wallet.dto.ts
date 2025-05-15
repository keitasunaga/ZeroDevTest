import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletDto {
  @ApiProperty({ description: 'ユーザーID' })
  userId: string;

  @ApiProperty({ description: '秘密鍵' })
  privateKey: string;

  @ApiProperty({ description: 'チェーンID' })
  chainId: number;
} 