import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateDidDto {
  @ApiProperty({
    description: 'ウォレットID',
    example: 'wallet_12345',
  })
  @IsString()
  @IsNotEmpty()
  walletId: string;
}

export class CreateDidResponseDto {
  @ApiProperty({
    description: '作成されたDID',
    example: 'did:ethr:sepolia:0x1234567890123456789012345678901234567890',
  })
  did: string;

  @ApiProperty({
    description: 'ウォレットアドレス',
    example: '0x1234567890123456789012345678901234567890',
  })
  walletAddress: string;

  @ApiProperty({
    description: 'チェーン名',
    example: 'sepolia',
  })
  chainName: string;
} 