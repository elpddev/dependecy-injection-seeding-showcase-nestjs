import { Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../common/Prisma.service";
import { faker } from "@faker-js/faker";

export class UserFactory {
  static $inject = [PrismaService];

  private readonly logger = new Logger(UserFactory.name);

  constructor(private prisma: PrismaClient) {}

  async create() {
    const user = await this.prisma.user.create({
      data: {
        email: 'lisa@simpson.com',
        firstname: 'Lisa',
        lastname: 'Simpson',
        password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // secret42
        role: 'USER',
      },
    });

    return user;
  }
}

