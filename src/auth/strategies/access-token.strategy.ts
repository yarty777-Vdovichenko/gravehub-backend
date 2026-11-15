import { ForbiddenException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../../config/env';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.jwtAccessSecret,
    });
  }

  async validate(payload: { sub: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { emailVerified: true },
    });

    if (!user || !user.emailVerified) {
      throw new ForbiddenException(
        'Підтвердіть електронну пошту для доступу до системи',
      );
    }

    return {
      userId: payload.sub,
      role: payload.role,
    };
  }
}
