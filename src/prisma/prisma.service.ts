// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const adapter = new PrismaPg({
            connectionString: process.env.PRISMA_DATABASE_URL!,
        });
        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect(); // 应用启动时连接数据库
    }

    async onModuleDestroy() {
        await this.$disconnect(); // 应用关闭时断开
    }
}
