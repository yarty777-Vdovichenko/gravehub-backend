import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { TokenType } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

// Ліміти на відправлення листів (на користувача й тип листа).
export const TOKEN_EMAIL_COOLDOWN_MS = 60 * 1000; // мінімум 60 с між листами
export const TOKEN_EMAIL_WINDOW_MS = 60 * 60 * 1000; // вікно підрахунку — 1 год
export const TOKEN_EMAIL_MAX_PER_WINDOW = 5; // максимум листів за вікно

@Injectable()
export class AccountTokensService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async assertWithinLimits(userId: string, type: TokenType) {
    const recent = await this.prisma.userToken.findMany({
      where: {
        userId,
        type,
        createdAt: { gte: new Date(Date.now() - TOKEN_EMAIL_WINDOW_MS) },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: TOKEN_EMAIL_MAX_PER_WINDOW,
    });

    const lastAt = recent[0]?.createdAt.getTime();
    const tooSoon =
      lastAt !== undefined && Date.now() - lastAt < TOKEN_EMAIL_COOLDOWN_MS;

    if (tooSoon || recent.length >= TOKEN_EMAIL_MAX_PER_WINDOW) {
      throw new HttpException(
        'Забагато запитів на надсилання листа. Спробуйте пізніше',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async create(userId: string, type: TokenType, ttlMinutes: number) {
    await this.assertWithinLimits(userId, type);

    // Не видаляємо старі токени, а позначаємо недійсними:
    // так зберігається історія відправлень для підрахунку лімітів.
    await this.prisma.userToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    await this.prisma.userToken.create({
      data: {
        userId,
        type,
        tokenHash: this.hash(token),
        expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
      },
    });
    return token;
  }

  async consume(token: string, type: TokenType) {
    const tokenHash = this.hash(token);

    const result = await this.prisma.userToken.updateMany({
      where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (result.count === 0) {
      throw new BadRequestException('Посилання недійсне або прострочене');
    }

    const row = await this.prisma.userToken.findUnique({
      where: { tokenHash },
    });
    return row!.userId;
  }
}
