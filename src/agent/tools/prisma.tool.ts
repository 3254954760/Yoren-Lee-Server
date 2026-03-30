import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';

export function createPrismaTool(prisma: PrismaService) {
  return new DynamicStructuredTool({
    name: 'query_character',
    description:
      '查询小说中的角色信息，包括性格、背景、人物关系等设定。当需要了解角色特征、保持人物一致性时使用此工具。',
    schema: z.object({
      novelId: z.number().describe('小说 ID'),
      characterName: z
        .string()
        .optional()
        .describe('角色名称，不传则返回该小说所有角色'),
    }),
    func: async ({ novelId, characterName }) => {
      const where: any = { novelId };
      if (characterName) {
        where.name = { contains: characterName };
      }

      const characters = await prisma.character.findMany({
        where,
        select: {
          name: true,
          personality: true,
          background: true,
          metadata: true,
        },
      });

      if (characters.length === 0) {
        return characterName
          ? `未找到名为"${characterName}"的角色。`
          : '该小说暂无角色设定。';
      }

      return characters
        .map((c) => {
          const parts = [`【${c.name}】`];
          if (c.personality) parts.push(`性格：${c.personality}`);
          if (c.background) parts.push(`背景：${c.background}`);
          if (c.metadata) parts.push(`扩展设定：${JSON.stringify(c.metadata)}`);
          return parts.join('\n');
        })
        .join('\n\n');
    },
  });
}
