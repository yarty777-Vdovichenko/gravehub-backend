import { BadRequestException, Injectable } from '@nestjs/common';
import { TokenType } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AccountTokensService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(userId: string, type: TokenType, ttlMinutes: number) {
    await this.prisma.userToken.deleteMany({
      where: { userId, type, usedAt: null },
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
