import { Controller, Post, Get, Param, ParseIntPipe, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('agent')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('sessions')
  getSessions(@CurrentUser() user: { userId: number; username: string }) {
    return this.chatService.getUserSessions(user.userId);
  }

  @Get('sessions/:id/messages')
  getSessionMessages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; username: string },
  ) {
    return this.chatService.getSessionMessages(id, user.userId);
  }

  /**
   * POST /agent/chat — SSE 流式对话
   *
   * SSE 事件类型:
   *   event: session  → { sessionId: number }    首次返回会话 ID
   *   event: delta    → { content: string }      流式内容片段
   *   event: done     → { sessionId, content }   完整响应
   *   event: error    → { message: string }      错误信息
   */
  @Post('chat')
  chat(
    @Body() dto: ChatDto,
    @CurrentUser() user: { userId: number; username: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const observable = this.chatService.chatStream(dto, user.userId);

    const subscription = observable.subscribe({
      next: (event) => {
        if (event.type) {
          res.write(`event: ${event.type}\n`);
        }
        res.write(`data: ${event.data}\n\n`);
      },
      error: (err) => {
        res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
        res.end();
      },
      complete: () => {
        res.end();
      },
    });

    res.on('close', () => {
      subscription.unsubscribe();
    });
  }
}
