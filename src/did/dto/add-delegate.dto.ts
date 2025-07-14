import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsIn } from 'class-validator';

export class AddDelegateDto {
  @ApiProperty({
    description: 'デリゲートタイプ',
    example: 'sigAuth',
    enum: ['sigAuth', 'veriKey'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['sigAuth', 'veriKey'])
  delegateType: string;

  @ApiProperty({
    description: 'デリゲートアドレス',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @IsNotEmpty()
  delegateAddress: string;

  @ApiProperty({
    description: '有効期限（秒）',
    example: 31536000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  validity?: number;
}

export class RevokeDelegateDto {
  @ApiProperty({
    description: 'デリゲートタイプ',
    example: 'sigAuth',
    enum: ['sigAuth', 'veriKey'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['sigAuth', 'veriKey'])
  delegateType: string;

  @ApiProperty({
    description: 'デリゲートアドレス',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @IsNotEmpty()
  delegateAddress: string;
}

export class DelegateResponseDto {
  @ApiProperty({
    description: 'トランザクションハッシュ',
    example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'デリゲートタイプ',
    example: 'sigAuth',
  })
  delegateType: string;

  @ApiProperty({
    description: 'デリゲートアドレス',
    example: '0x1234567890123456789012345678901234567890',
  })
  delegateAddress: string;

  @ApiProperty({
    description: '有効期限（秒）- 削除の場合は含まれない',
    example: 31536000,
    required: false,
  })
  validity?: number;
} 