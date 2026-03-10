import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // enforce binary engine unless something else is specified in the
    // environment (see earlier conversations about PrismaClientConstructorValidationError)
    if (!process.env.PRISMA_CLIENT_ENGINE_TYPE) {
      process.env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';
    }
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}