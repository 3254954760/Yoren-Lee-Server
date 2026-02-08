import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';


@Controller('auth/github')
export class AuthController {
    constructor(private authService: AuthService) { }

    /**
     * 前端拿到 GitHub code 后调用此接口
     */
    @Public()
    @Post('login')
    async githubLogin(@Body('code') code: string) {
        return this.authService.githubLoginByCode(code);
    }

    @Public()
    @Get('test')
    async test() {
        return false;
    }
}
