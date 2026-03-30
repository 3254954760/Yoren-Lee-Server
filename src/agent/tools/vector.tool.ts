import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { VectorDBService } from '../../vectorDB/vectorDB.service';

export function createVectorTool(vectorDB: VectorDBService) {
  return new DynamicStructuredTool({
    name: 'search_plot_memory',
    description:
      '根据语义检索小说的剧情记忆，包括章节摘要、情感节点、人物行为等。当需要回忆之前的剧情发展、查找相关情节时使用此工具。',
    schema: z.object({
      query: z.string().describe('检索关键词或描述，如"主角第一次遇到反派"'),
      novelId: z.number().describe('小说 ID'),
      topK: z.number().optional().default(5).describe('返回结果数量'),
    }),
    func: async ({ query, novelId, topK }) => {
      const results = await vectorDB.query(query, {
        topK,
        filter: `novelId = ${novelId}`,
        includeMetadata: true,
      });

      if (!results || results.length === 0) {
        return '未找到相关剧情记忆。';
      }

      return results
        .map((r: any, i: number) => {
          const meta = r.metadata ?? {};
          return `[${i + 1}] (相似度: ${(r.score * 100).toFixed(1)}%) [${meta.type ?? 'unknown'}]\n${meta.content ?? ''}`;
        })
        .join('\n\n');
    },
  });
}
