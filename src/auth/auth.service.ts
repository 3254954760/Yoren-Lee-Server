// 业务逻辑：GitHub 登录、用户创建、JWT 生成
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { GithubProfile } from './interfaces/github-profile.interface';

@Injectable()
export class AuthService {

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async githubLoginByCode(code: string) {
        const tokenResponse = await fetch(
            `https://github.com/login/oauth/access_token?client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`,
            {
                method: 'POST',
                headers: { Accept: 'application/json' },
            },
        );
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            throw new Error('GitHub OAuth failed: no access token');
        }

        // 2️⃣ 用 access_token 拿用户信息
        const userResponse = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` },
        });
        const githubUser = await userResponse.json();

        const profile: GithubProfile = {
            githubId: githubUser.id.toString(),
            username: githubUser.login,
            email: githubUser.email,
            avatar: githubUser.avatar_url,
        };

        // 3️⃣ 查找本地 account
        let account = await this.prisma.account.findUnique({
            where: { provider_providerId: { provider: 'GITHUB', providerId: profile.githubId } },
            include: { user: true },
        });

        // 4️⃣ 如果不存在 → 创建用户 + account
        if (!account) {
            const user = await this.prisma.user.create({
                data: {
                    username: profile.username,
                    email: profile.email,
                    avatar: profile.avatar,
                },
            });

            account = await this.prisma.account.create({
                data: {
                    provider: 'GITHUB',
                    providerId: profile.githubId,
                    username: profile.username,
                    email: profile.email,
                    avatar: profile.avatar,
                    userId: user.id,
                },
                include: { user: true },
            });
        }

        const payload = { sub: account.user.id, username: account.user.username };
        return { access_token: this.jwtService.sign(payload) };
    }
}
