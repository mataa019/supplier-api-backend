import { Module } from '@nestjs/common';
import { AuthModule } from './Auth/auth.module';

@Module({
  imports: [AuthModule],
})
export class AppModule {}
