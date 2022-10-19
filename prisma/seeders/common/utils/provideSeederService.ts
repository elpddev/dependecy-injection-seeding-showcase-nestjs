import { PrismaService } from '../Prisma.service';
import { SeederClassType } from './SeederClassType';

export function provideSeederService<T extends SeederClassType>(
  seederClassType: T
) {
  const factory = async ({ prisma }: PrismaService, ...rest: any[]) => {
    const seederService = new seederClassType(prisma, ...rest);
    await seederService.seed();
    return seederService;
  };

  return {
    // the class will be used as DI token
    provide: seederClassType,
    useFactory: factory,
    inject: seederClassType.$inject,
  };
}
