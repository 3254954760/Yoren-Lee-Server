import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SessionModule } from '../session/session.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [SessionModule, AgentModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
