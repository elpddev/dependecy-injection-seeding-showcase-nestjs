import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../common/Prisma.service';
import { faker } from '@faker-js/faker';
import { hash } from 'bcrypt';
import { UserFactory } from './UserFactory.service';

export class UsersSeeder {
  static $inject = [PrismaService, UserFactory];

  private readonly logger = new Logger(UsersSeeder.name);

  constructor(private prisma: PrismaClient, private userFactory: UserFactory) {}

  async seed() {
    this.logger.log('Seeding users...');

    await this.prisma.user.deleteMany();

    //const { BCRYPT_SALT } = process.env;
    // const salt = parseSalt(BCRYPT_SALT);

    await this.userFactory.create();

    this.logger.log('Seeding users done');
  }
}
