import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { WalletModule } from './wallet/wallet.module';
import { TokenModule } from './token/token.module';
import { DidModule } from './did/did.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    WalletModule,
    TokenModule,
    DidModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { } 