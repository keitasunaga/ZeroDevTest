import { ApiProperty } from '@nestjs/swagger';

export class RecoverWalletDto {
  @ApiProperty({ description: 'ウォレットID' })
  walletId: string;
} 