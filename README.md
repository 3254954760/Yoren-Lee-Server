# nest + prisma

### 初始化
```
pnpm install
npm run init
```

### prisma 同步远端流程
1. npx prisma generate 生成本地Prisma Client
2. npx prisma migrate dev --name add-nickname-to-user 生成新的 migration 文件
3. npx prisma migrate deploy 同步到远端


### 业务流程
sequenceDiagram
    participant User
    participant Controller
    participant ChatService
    participant SessionSvc as SessionService
    participant VectorDB
    participant Prisma
    participant Agent
    participant LLM as Qwen

    User->>Controller: POST /agent/chat {novelId, message, sessionId?}
    Controller->>ChatService: chat(dto, userId)

    alt no sessionId
        ChatService->>SessionSvc: createSession(novelId, userId)
        SessionSvc-->>ChatService: new sessionId
    end

    ChatService->>SessionSvc: getRecentMessages(sessionId)
    SessionSvc-->>ChatService: messages from Redis

    ChatService->>Agent: invoke(message, context)
    Note over Agent: Agent has 3 tools
    Agent->>VectorDB: vectorTool - search related plot
    Agent->>Prisma: prismaTool - query characters
    Agent->>LLM: generate with context + tool results
    LLM-->>Agent: response
    Agent-->>ChatService: result

    ChatService->>SessionSvc: saveMessages(sessionId, user+assistant)
    ChatService->>VectorDB: store summary embedding
    ChatService-->>Controller: response
    Controller-->>User: {code: 0, data: {sessionId, reply}}


### 文件结构
```
src/
├── chat/                     (新建 - 编排层)
│   ├── chat.module.ts
│   ├── chat.controller.ts
│   ├── chat.service.ts
│   └── dto/chat.dto.ts
├── session/                  (新建 - 短期记忆)
│   ├── session.module.ts
│   └── session.service.ts
├── agent/                    (新建 - LangChain Agent)
│   ├── agent.module.ts
│   ├── agent.service.ts
│   └── tools/
│       ├── vector.tool.ts
│       ├── prisma.tool.ts
│       └── style.tool.ts
├── prisma/                   (已有)
├── vectorDB/                 (已有)
├── redis/                    (已有)
├── auth/                     (已有)
├── common/                   (已有)
└── app.module.ts             (修改)
```