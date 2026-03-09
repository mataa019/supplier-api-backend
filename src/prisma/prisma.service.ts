import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Call this from your bootstrap function once the app is created:
   *
   * const app = await NestFactory.create(AppModule);
   * const prisma = app.get(PrismaService);
   * await prisma.enableShutdownHooks(app);
   */
  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
