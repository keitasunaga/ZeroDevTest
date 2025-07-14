import { Module } from '@nestjs/common';
import { DidService } from './did.service';
import { DidController } from './did.controller';
import { UniversalResolverController } from './universal-resolver.controller';
import { WalletService } from '../wallet/wallet.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [DidController, UniversalResolverController],
  providers: [
    DidService,
    WalletService,
    PrismaService,
  ],
  exports: [DidService],
})
export class DidModule { } 