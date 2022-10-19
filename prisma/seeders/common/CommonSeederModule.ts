import { Logger, Module, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { provideSeederService } from "./utils/provideSeederService";
import { CurrenciesSeeder } from "./CurrenciesSeeder.service";
import { PrismaService } from "./Prisma.service";

@Module({
  providers: [
    PrismaService,
    provideSeederService(CurrenciesSeeder),
  ],
  exports: [
    PrismaService,
    CurrenciesSeeder,
  ],
})
export class CommonSeederModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CommonSeederModule.name);

  onModuleInit() {
    this.logger.log("Module init ...");
  }

  onModuleDestroy() {
    this.logger.log("Module destroy ...");
  }
}

