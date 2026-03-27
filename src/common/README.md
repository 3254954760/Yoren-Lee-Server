# Common 模块

统一 API 响应格式的公共组件。

## 目录结构

```
common/
├── interfaces/
│   └── response.interface.ts    # 响应类型定义
├── exceptions/
│   └── business.exception.ts    # 自定义业务异常类
├── interceptors/
│   └── transform.interceptor.ts # 全局成功响应拦截器
└── filters/
    └── http-exception.filter.ts # 全局异常过滤器
```

## 响应格式

### 成功

```json
{
  "code": 0,
  "data": { ... }
}
```

### 失败

```json
{
  "code": 20001,
  "errorMsg": {
    "message": "错误描述",
    "detail": "详细信息（可选）"
  }
}
```

HTTP 状态码正常返回（401、404、500 等），body 中的 `code` 为业务错误码，两者独立。

## 业务错误码

| 常量 | 值 | 含义 |
|------|------|------|
| `PARAM_INVALID` | 10001 | 参数校验失败 |
| `AUTH_FAILED` | 20001 | 认证失败 |
| `FORBIDDEN` | 20002 | 权限不足 |
| `NOT_FOUND` | 30001 | 资源不存在 |

## 使用方式

### 成功响应

Controller 正常返回即可，拦截器自动包装：

```typescript
@Get('users')
async getUsers() {
  return this.userService.findAll();
  // 自动返回 { code: 0, data: [...] }
}
```

### 抛出业务异常

```typescript
import { BusinessException, BizErrorCode } from '../common/exceptions/business.exception';
import { HttpStatus } from '@nestjs/common';

throw new BusinessException(
  BizErrorCode.AUTH_FAILED,
  'GitHub 认证失败',
  '未获取到 access_token',
  HttpStatus.UNAUTHORIZED,
);
// HTTP 401 + { code: 20001, errorMsg: { message: "GitHub 认证失败", detail: "未获取到 access_token" } }
```

### 使用 NestJS 内置异常

```typescript
import { NotFoundException } from '@nestjs/common';

throw new NotFoundException('用户不存在');
// HTTP 404 + { code: 404, errorMsg: { message: "用户不存在" } }
```

### ValidationPipe 校验失败

DTO 校验失败时自动返回：

```json
{
  "code": 10001,
  "errorMsg": {
    "message": "参数校验失败",
    "detail": ["email must be an email", "password should not be empty"]
  }
}
```

## 注册方式

在 `main.ts` 中全局注册：

```typescript
app.useGlobalInterceptors(new TransformInterceptor());
app.useGlobalFilters(new HttpExceptionFilter());
```
