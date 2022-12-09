# Nest IOC DI (Dependency Injection) as a Seeds Tasks Runner Showcase

Using Nest DI as a task runner for seeding the DB.

* This NestJs repo is based on the [NoticeDev starter rep](https://github.com/notiz-dev/nestjs-prisma-starter).
* The article of the repo can be found on [dev.to](https://dev.to/elpddev/nest-ioc-di-dependency-injection-as-a-seeds-tasks-runner-57k2)

## Why?

Nest and the Prisma example provides only a rudimentary examples for seeding. No options to provide dependencies between the seeding tasks and no factories for the seeding.

**seed.ts**

```ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.user.deleteMany();
  await prisma.post.deleteMany();
  console.log('Seeding...');
  const user1 = await prisma.user.create({
    data: {
      email: 'lisa@simpson.com',
      firstname: 'Lisa',
      lastname: 'Simpson',
      password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // secret42
      role: 'USER',
      posts: {
        create: {
          title: 'Join us for Prisma Day 2019 in Berlin',
          content: 'https://www.prisma.io/day/',
          published: true,
        },
      },
    },
  });
  const user2 = await prisma.user.create({
    data: {
      email: 'bart@simpson.com',
      firstname: 'Bart',
      lastname: 'Simpson',
      role: 'ADMIN',
      password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // secret42
      posts: {
        create: [
          {
            title: 'Subscribe to GraphQL Weekly for community news',
            content: 'https://graphqlweekly.com/',
            published: true,
          },
          {
            title: 'Follow Prisma on Twitter',
            content: 'https://twitter.com/prisma',
            published: false,
          },
        ],
      },
    },
  });
  console.log({ user1, user2 });
}
main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
```

In contrast, in other frameworks, for example in [ruby rake](https://ruby.github.io/rake/doc/rakefile_rdoc.html#label-Tasks+with+Prerequisites) you can define tasks and dependencies between those tasks.

```ruby
task name: [:prereq1, :prereq2] do |t|
  # actions (may reference t)
end
```

Another example is in [gulp](https://gulpjs.com/docs/en/getting-started/creating-tasks#compose-tasks) where `compoosed tasks` can be used to build a tree of dependencies between tasks.

```js
const { series, parallel } = require('gulp');

function clean(cb) {
  // body omitted
  cb();
}

function css(cb) {
  // body omitted
  cb();
}

function javascript(cb) {
  // body omitted
  cb();
}

exports.build = series(clean, parallel(css, javascript));
```

This article shows a way to achieve the same pattern of tasks and tasks dependencies by utilizing Nest base app DI mechanism for tasks execution system.

## Architecture

The DI (dependency injection) system of Nest, allows declaring services and in those services, declare their dependency on other services.

This means if service A lifecycle of initialization (OnInit, constructor..) is used for performing a task, then service B that depends on it, can be sure that when it itself is initialized, then service A has finished its initialization and task.

That is the main solution. Using DI to declare services that depends on other services. A service get initialize only after its dependencies finished to be initialized also.

## Solution Walkthrough

**seed.ts**

In the root file, you create a [standalone Nest app](https://docs.nestjs.com/standalone-applications). Then seeding services can be declared on the app module or be divided to sub modules (Dev, Stage, Common...).

```ts
import { NestFactory } from "@nestjs/core";
import { DevelopmentSeederModule } from "./seeders/development/DevelopmentSeederModule";

async function main() {
  await bootstrap();
}

async function bootstrap() {
  const seederModule = DevelopmentSeederModule;

  const app = await NestFactory.createApplicationContext(seederModule, {
    logger: [
      "error",
      "warn",
      "log",
      // "debug",
      // "verbose"
    ],
  });

  // Starts listening for shutdown hooks
  app.enableShutdownHooks();

  await app.close();
}

main()
  .catch((e) => console.error(e));
```

**DevelopmentSeederModule**

Each seeding module declares a seeding services. The `provideSeederService` utility is used here to declare an async factory seeder service.

```ts
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
```

**provideSeederService.ts**

Since seeding the DB is asynchronous work, we can not rely on the constructor to be the seeding point of work.

Instead, Nest [asynchronous providers](https://docs.nestjs.com/fundamentals/async-providers) can be used to mark when the service has finished its `initialization` - its seeding work.

Each seeding service, needs to implement an interface consist of a `async seed` function that the factory activate in the initialization process.

```ts
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
```

**UserSeeder.service.ts**

A seeding service consists of a custom `$inject` property that the factory use for declaring its dependencies and an `async seed` function that do the seeding work.

```ts
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
```

**UserFactory.service.ts**

A model factory service is used as an encapsulation of the `create` logic for an entity. This includes generating random values and/or use other factories to create dependencies of the model.

```ts
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
```

**CommonSeederModule**

```ts
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
```

**Prisma.service.ts**

```ts
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
```

**SeederClassType.ts**

```ts
export type SeederClassCtor = new (...args: any[]) => any;

export type SeederClassType = SeederClassCtor & {
  $inject: any[];
};
```

## Summary

As you can see, Nest base app with the DI mechanism can be utilizes as a task runner - service initialization - with the ability to define dependencies between the tasks - injection of services into other services.

By using this pattern, you can achieve an asynchronous task runner system with dependencies capability.


## Instructions

```
pnpm add -g @nestjs/cli
```

```bash
pnpm install
```

```bash
pnpm docker:db
```

```bash
pnpm prisma migrate dev
```

```bash
pnpm prisma generate
```

```bash
pnpm seed
```
