import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subscriber } from 'rxjs';
import { SessionService } from '../session/session.service';
import { AgentService } from '../agent/agent.service';
import { VectorDBService } from '../vectorDB/vectorDB.service';
import { ChatDto } from './dto/chat.dto';
import { randomUUID } from 'crypto';

interface SseEvent {
  data: string;
  type?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private sessionService: SessionService,
    private agentService: AgentService,
    private vectorDB: VectorDBService,
  ) {}

  getUserSessions(userId: number) {
    return this.sessionService.getUserSessions(userId);
  }

  getSessionMessages(sessionId: number, userId: number) {
    return this.sessionService.getSessionMessages(sessionId, userId);
  }

  chatStream(dto: ChatDto, userId: number): Observable<SseEvent> {
    return new Observable((subscriber: Subscriber<SseEvent>) => {
      this.handleStream(dto, userId, subscriber).catch((err) => {
        this.logger.error('Chat stream error', err);
        subscriber.next({
          type: 'error',
          data: JSON.stringify({ message: err.message ?? '服务器内部错误' }),
        });
        subscriber.complete();
      });
    });
  }

  private async handleStream(
    dto: ChatDto,
    userId: number,
    subscriber: Subscriber<SseEvent>,
  ) {
    const { novelId, message } = dto;

    let sessionId: number;

    if (dto.sessionId) {
      await this.sessionService.getSession(dto.sessionId, userId);
      sessionId = dto.sessionId;
    } else {
      const session = await this.sessionService.createSession(
        novelId,
        userId,
        message,
      );
      sessionId = session.id;
    }

    subscriber.next({
      type: 'session',
      data: JSON.stringify({ sessionId }),
    });

    const history = await this.sessionService.getRecentMessages(
      sessionId,
      userId,
    );

    let fullReply = '';

    const stream = this.agentService.stream({
      novelId,
      message,
      history,
    });

    for await (const chunk of stream) {
      fullReply += chunk;
      subscriber.next({
        type: 'delta',
        data: JSON.stringify({ content: chunk }),
      });
    }

    subscriber.next({
      type: 'done',
      data: JSON.stringify({ sessionId, content: fullReply }),
    });

    subscriber.complete();

    await this.sessionService.saveMessages(sessionId, [
      { role: 'user', content: message },
      { role: 'assistant', content: fullReply },
    ]);

    this.storeToVectorMemory(novelId, sessionId, message, fullReply).catch(
      (err) => this.logger.error('Failed to store vector memory', err),
    );
  }

  private async storeToVectorMemory(
    novelId: number,
    sessionId: number,
    userMessage: string,
    assistantReply: string,
  ) {
    const summary = `用户: ${userMessage}\n助手: ${assistantReply.slice(0, 200)}`;
    const id = `${novelId}:conversation:${randomUUID()}`;

    await this.vectorDB.upsert(id, summary, {
      novelId,
      sessionId,
      type: 'conversation',
      content: summary,
    });
  }
}
