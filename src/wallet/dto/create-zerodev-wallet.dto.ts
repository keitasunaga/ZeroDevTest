import { ApiProperty } from '@nestjs/swagger';

export class CreateZeroDevWalletDto {
  @ApiProperty({ description: 'ユーザーID' })
  userId: string;
} 