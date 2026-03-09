import { Module } from '@nestjs/common';
import { AuthModule } from './Auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [PrismaService],
})
export class AppModule {}
