import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {
    this.client = new Redis({
      url: this.configService.get<string>('KV_REST_API_URL')!,
      token: this.configService.get<string>('KV_REST_API_TOKEN')!,
    });
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      this.logger.log('Redis connected');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
    }
  }

  /** 设置值，ttl 单位为秒 */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.set(key, value, { ex: ttl });
    } else {
      await this.client.set(key, value);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.client.get<T>(key);
  }

  async del(...keys: string[]): Promise<void> {
    await this.client.del(...keys);
  }

  async exists(...keys: string[]): Promise<number> {
    return this.client.exists(...keys);
  }

  /** 在列表左侧推入元素 */
  async lpush(key: string, ...values: unknown[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  /** 获取列表指定范围的元素 */
  async lrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]> {
    return this.client.lrange<T>(key, start, stop);
  }

  /** 裁剪列表，只保留指定范围 */
  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.client.ltrim(key, start, stop);
  }

  /** 设置过期时间，单位秒 */
  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  /** 获取底层 Redis 客户端实例 */
  getClient(): Redis {
    return this.client;
  }
}
