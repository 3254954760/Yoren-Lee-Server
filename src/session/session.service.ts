import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface MessagePayload {
  role: string;
  content: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly RECENT_MSG_LIMIT = 20;
  private readonly REDIS_TTL = 3600; // 1 小时

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private redisKey(sessionId: number): string {
    return `session:${sessionId}:messages`;
  }

  async createSession(novelId: number, userId: number, firstMessage?: string) {
    const title = firstMessage
      ? firstMessage.slice(0, 20) + (firstMessage.length > 20 ? '...' : '')
      : undefined;

    const session = await this.prisma.session.create({
      data: { novelId, userId, title },
    });

    this.logger.log(`Session created: ${session.id} for user ${userId}`);
    return session;
  }

  async getSession(sessionId: number, userId: number) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ForbiddenException('会话不存在');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('无权访问此会话');
    }

    return session;
  }

  async getRecentMessages(
    sessionId: number,
    userId: number,
  ): Promise<MessagePayload[]> {
    await this.getSession(sessionId, userId);

    const cached = await this.redis.lrange<MessagePayload>(
      this.redisKey(sessionId),
      0,
      this.RECENT_MSG_LIMIT - 1,
    );

    if (cached && cached.length > 0) {
      return cached;
    }

    const dbMessages = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: this.RECENT_MSG_LIMIT,
      select: { role: true, content: true, metadata: true },
    });

    const messages = dbMessages.reverse() as MessagePayload[];

    if (messages.length > 0) {
      for (const msg of messages) {
        await this.redis.lpush(this.redisKey(sessionId), msg);
      }
      await this.redis.ltrim(
        this.redisKey(sessionId),
        0,
        this.RECENT_MSG_LIMIT - 1,
      );
      await this.redis.expire(this.redisKey(sessionId), this.REDIS_TTL);
    }

    return messages;
  }

  async saveMessages(sessionId: number, messages: MessagePayload[]) {
    await this.prisma.message.createMany({
      data: messages.map((msg) => ({
        sessionId,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata ?? undefined,
      })),
    });

    for (const msg of messages) {
      await this.redis.lpush(this.redisKey(sessionId), msg);
    }
    await this.redis.ltrim(
      this.redisKey(sessionId),
      0,
      this.RECENT_MSG_LIMIT - 1,
    );
    await this.redis.expire(this.redisKey(sessionId), this.REDIS_TTL);
  }

  async updateSummary(sessionId: number, summary: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { summary },
    });
  }
}
