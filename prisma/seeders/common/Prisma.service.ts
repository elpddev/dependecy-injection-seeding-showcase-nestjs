import { OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

export class PrismaService implements OnModuleDestroy {
  prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  onModuleDestroy() {
    this.prisma.$disconnect();
  }
}

