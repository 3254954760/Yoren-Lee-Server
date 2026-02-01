// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const connectionString = process.env.PRISMA_DATABASE_URL!;
        const adapter = new PrismaPg({ connectionString });
        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect(); // 应用启动时连接数据库
    }

    async onModuleDestroy() {
        await this.$disconnect(); // 应用关闭时断开
    }
}
