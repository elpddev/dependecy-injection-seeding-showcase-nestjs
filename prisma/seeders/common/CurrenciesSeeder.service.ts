import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from './Prisma.service';
import { currencies } from './data/currencies';

export class CurrenciesSeeder {
  static $inject = [PrismaService];

  private readonly logger = new Logger(CurrenciesSeeder.name);

  constructor(private prisma: PrismaClient) {}

  async seed() {
    this.logger.log('Seeding currencies...');

    for (const [code, name] of Object.entries(currencies)) {
      await this.prisma.currency.create({
        data: {
          code,
          name,
        },
      });
    }

    this.logger.log('Seeding currencies done');
  }
}
