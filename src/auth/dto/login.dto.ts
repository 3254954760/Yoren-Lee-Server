import { IsString } from 'class-validator';

export class LoginDto {
    /**
     * GitHub OAuth 授权码
     * 前端拿到 code 后传给后端
     */
    @IsString()
    code: string;
}
