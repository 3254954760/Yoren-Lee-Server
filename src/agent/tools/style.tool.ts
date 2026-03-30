import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service';

export function createStyleTool(prisma: PrismaService) {
  return new DynamicStructuredTool({
    name: 'get_writing_style',
    description:
      '获取小说的文风设定。在生成内容前使用此工具来确保写作风格一致。',
    schema: z.object({
      novelId: z.number().describe('小说 ID'),
    }),
    func: async ({ novelId }) => {
      const novel = await prisma.novel.findUnique({
        where: { id: novelId },
        select: { title: true, description: true, style: true },
      });

      if (!novel) {
        return '未找到该小说。';
      }

      const parts = [`小说：${novel.title}`];
      if (novel.description) parts.push(`简介：${novel.description}`);
      if (novel.style) {
        parts.push(`文风要求：${novel.style}`);
      } else {
        parts.push('文风要求：未设定，请使用通用文学风格。');
      }

      return parts.join('\n');
    },
  });
}
