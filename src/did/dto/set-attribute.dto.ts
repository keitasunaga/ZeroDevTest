import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class SetAttributeDto {
  @ApiProperty({
    description: '属性キー',
    example: 'did/svc/MessagingService',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: '属性値',
    example: '{"type": "MessagingService", "serviceEndpoint": "https://messaging.example.com"}',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

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

export class SetServiceAttributeDto {
  @ApiProperty({
    description: 'サービス名',
    example: 'MessagingService',
  })
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @ApiProperty({
    description: 'サービスエンドポイント',
    example: 'https://messaging.example.com',
  })
  @IsString()
  @IsNotEmpty()
  serviceEndpoint: string;

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

export class SetPublicKeyAttributeDto {
  @ApiProperty({
    description: '鍵タイプ',
    example: 'Ed25519',
  })
  @IsString()
  @IsNotEmpty()
  keyType: string;

  @ApiProperty({
    description: '鍵の用途',
    example: 'veriKey',
  })
  @IsString()
  @IsNotEmpty()
  keyPurpose: string;

  @ApiProperty({
    description: 'エンコーディング',
    example: 'base64',
  })
  @IsString()
  @IsNotEmpty()
  encoding: string;

  @ApiProperty({
    description: '公開鍵',
    example: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...',
  })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

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

export class SetAttributeResponseDto {
  @ApiProperty({
    description: 'トランザクションハッシュ',
    example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  transactionHash: string;

  @ApiProperty({
    description: '設定した属性キー',
    example: 'did/svc/MessagingService',
  })
  key: string;

  @ApiProperty({
    description: '設定した属性値',
    example: '{"type": "MessagingService", "serviceEndpoint": "https://messaging.example.com"}',
  })
  value: string;

  @ApiProperty({
    description: '有効期限（秒）',
    example: 31536000,
  })
  validity: number;
} 