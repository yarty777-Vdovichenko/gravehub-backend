import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_REFRESH_SECRET!,
      passReqToCallback: true,
    });
  }
  validate(req: Request, payload: any) {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return;
    }

    const refreshToken = authorization.replace(/^Bearer\s+/i, '').trim();

    return {
      userId: payload.sub,
      refreshToken,
    };
  }
}
