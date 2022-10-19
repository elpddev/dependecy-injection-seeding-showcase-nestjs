import { Logger, Module, OnModuleDestroy, OnModuleInit, Scope } from '@nestjs/common';
import { CommonSeederModule } from '../common/CommonSeederModule';
import { provideSeederService } from '../common/utils/provideSeederService';
import { UsersSeeder } from './UsersSeeder.service';
import { UserFactory } from './UserFactory.service';
import { PrismaService } from '../common/Prisma.service';

@Module({
  imports: [CommonSeederModule],
  providers: [
    {
      provide: UserFactory,
      useFactory: ({ prisma }: PrismaService) => {
        const instance = new UserFactory(prisma);
        return instance;
      },
      inject: UserFactory.$inject,
    },
    provideSeederService(UsersSeeder),
  ],
})
export class DevelopmentSeederModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DevelopmentSeederModule.name);

  onModuleInit() {
    this.logger.log('Module init ...');
  }

  onModuleDestroy() {
    this.logger.log('Module destroy ...');
  }
}
