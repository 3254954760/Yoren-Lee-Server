import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';


@Controller('auth/github')
export class AuthController {
    constructor(private authService: AuthService) { }

    /**
     * 前端拿到 GitHub code 后调用此接口
     */
    @Public()
    @Post('code')
    async githubLogin(@Body('code') code: string) {
        return this.authService.githubLoginByCode(code);
    }

    @Get('test')
    async test(@CurrentUser() user: any) {
        return user;
    }
}
