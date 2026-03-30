import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
  AIMessageChunk,
  type BaseMessage,
} from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { concat } from '@langchain/core/utils/stream';
import { PrismaService } from '../prisma/prisma.service';
import { VectorDBService } from '../vectorDB/vectorDB.service';
import { createVectorTool } from './tools/vector.tool';
import { createPrismaTool } from './tools/prisma.tool';
import { createStyleTool } from './tools/style.tool';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface InvokeParams {
  novelId: number;
  message: string;
  history: ChatMessage[];
}

const SYSTEM_PROMPT = `你是一个专业的小说创作助手。你可以帮助用户续写小说、讨论剧情、塑造人物。

你拥有以下工具：
- search_plot_memory：检索之前的剧情记忆，在需要回顾之前发生的事情时使用
- query_character：查询角色的性格、背景等设定，在涉及特定角色时使用以保持人物一致性
- get_writing_style：获取小说的文风设定，在生成内容前使用以保持风格统一

请在需要时主动调用工具获取信息，确保创作内容与已有剧情和人物设定保持一致。`;

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private llm: ChatOpenAI;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private vectorDB: VectorDBService,
  ) {
    this.llm = new ChatOpenAI({
      modelName: 'qwen-plus',
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      },
      apiKey: this.configService.get<string>('DASHSCOPE_API_KEY'),
      temperature: 0.8,
      streaming: true,
    });
  }

  async *stream({ novelId, message, history }: InvokeParams): AsyncGenerator<string> {
    const tools: StructuredToolInterface[] = [
      createVectorTool(this.vectorDB),
      createPrismaTool(this.prisma),
      createStyleTool(this.prisma),
    ];

    const toolMap = new Map<string, StructuredToolInterface>(
      tools.map((t) => [t.name, t]),
    );
    const llmWithTools = this.llm.bindTools(tools);

    const currentMessages: BaseMessage[] = [
      new SystemMessage(SYSTEM_PROMPT),
    ];

    for (const msg of history) {
      if (msg.role === 'user') {
        currentMessages.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        currentMessages.push(new AIMessage(msg.content));
      }
    }

    currentMessages.push(new HumanMessage(message));

    const MAX_ITERATIONS = 5;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const stream = await llmWithTools.stream(currentMessages);

      let gathered: AIMessageChunk | undefined;
      for await (const chunk of stream) {
        gathered = gathered ? concat(gathered, chunk) : chunk;

        const text =
          typeof chunk.content === 'string' ? chunk.content : '';
        if (text) {
          yield text;
        }
      }

      if (!gathered) break;

      const toolCalls = gathered.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        return;
      }

      // Tool calling 阶段：不输出给前端，执行工具后继续循环
      currentMessages.push(gathered);

      for (const toolCall of toolCalls) {
        const tool = toolMap.get(toolCall.name);
        if (!tool) {
          this.logger.warn(`Tool not found: ${toolCall.name}`);
          continue;
        }

        this.logger.log(`Calling tool: ${toolCall.name}`);
        const toolResult = await tool.invoke({
          ...toolCall.args,
          novelId,
        } as any);

        currentMessages.push(
          new ToolMessage({
            content:
              typeof toolResult === 'string'
                ? toolResult
                : JSON.stringify(toolResult),
            tool_call_id: toolCall.id!,
          }),
        );
      }
    }

    // 兜底：工具循环用尽后做最后一次流式生成
    const finalStream = await this.llm.stream(currentMessages);
    for await (const chunk of finalStream) {
      const text = typeof chunk.content === 'string' ? chunk.content : '';
      if (text) {
        yield text;
      }
    }
  }
}
