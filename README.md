# nest + prisma

### prisma 同步远端流程
1. npx prisma generate 生成本地Prisma Client
2. npx prisma migrate dev --name add-nickname-to-user 生成新的 migration 文件
3. npx prisma migrate deploy 同步到远端
