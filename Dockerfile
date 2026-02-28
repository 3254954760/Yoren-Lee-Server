FROM node:20-alpine

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install

# 复制 Prisma 文件
COPY prisma.config.ts ./
COPY prisma ./prisma

# 生成 Prisma Client
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 暴露端口
EXPOSE 3000

# 启动
CMD ["node", "dist/main"]
