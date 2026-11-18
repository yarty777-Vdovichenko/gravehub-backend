
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginUserDTO } from './dto/LoginUser.dto';
import bcrypt from 'bcrypt';
import { RegisterUserDTO } from './dto/RegisterUser.dto';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { EmployeeProfileDTO } from './dto/EmployeeProfile.dto';
import { env } from '../config/env';
import { MailService } from '../mail/mail.service';
import { AccountTokensService } from './account-tokens.service';
import { selectableServiceWhere } from 'src/services/services-query.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tokens: AccountTokensService,
    private readonly mail: MailService,
  ) {}

  hashToken = (token: string) => {
    return createHash('sha256').update(token).digest('hex');
  };

  async login(dto: LoginUserDTO) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Підтвердіть електронну пошту перед входом до системи',
      );
    }

    return this.issueTokens(user.id, user.activeMode);
  }

  async register(dto: RegisterUserDTO) {
    const userId = randomUUID();

    if (dto.role === 'employee') {
      if (!dto.employeeProfile) {
        throw new BadRequestException(
          "You didn't enter any info for employee profile",
        );
      }

      const { specializationIds, regionIds } = dto.employeeProfile;

      const services = await this.prisma.service.findMany({
        where: {
          id: { in: specializationIds },
          ...selectableServiceWhere,
        },
      });

      if (services.length !== specializationIds.length) {
        throw new BadRequestException(
          'One or more specializationIds are invalid',
        );
      }

      const regions = await this.prisma.region.findMany({
        where: { id: { in: regionIds } },
      });

      if (regions.length !== regionIds.length) {
        throw new BadRequestException('One or more regionIds are invalid');
      }
    }

    const hash = await bcrypt.hash(dto.password, 10);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: userId,
            email: dto.email.trim().toLowerCase(),
            passwordHash: hash,
            name: dto.name,
            roles: [dto.role],
            activeMode: dto.role,
            status: 'active',
          },
        });

        if (dto.role === 'employee') {
          const { specializationIds, regionIds, description } =
            dto.employeeProfile!;

          await tx.employeeProfile.create({
            data: {
              userId,
              description,
              status: 'available',
              rating: 0,
              completedContracts: 0,
              specialization: {
                connect: specializationIds.map((id) => ({ id })),
              },
              regions: {
                connect: regionIds.map((id) => ({ id })),
              },
            },
          });
        }
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('User with this email already exists');
      }

      throw e;
    }

    // Реєстрація не створює авторизовану сесію:
    // спочатку потрібно підтвердити пошту.
    // Якщо відправлення листа не вдалося, його можна надіслати повторно.
    void this.sendVerification(userId).catch(() => undefined);

    return {
      message: 'Акаунт створено. Підтвердіть електронну пошту, щоб увійти.',
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.emailVerified || !user.hashedRefreshToken) {
      throw new UnauthorizedException();
    }

    const matches =
      this.hashToken(refreshToken) === user.hashedRefreshToken;

    if (!matches) {
      throw new UnauthorizedException();
    }

    return this.issueTokens(user.id, user.activeMode);
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        activeMode: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      mode: user.activeMode,
    };
  }

  private async issueTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwt.sign(payload, {
      secret: env.jwtAccessSecret,
      expiresIn: '15m',
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: env.jwtRefreshSecret,
      expiresIn: '7d',
    });

    const hashedRt = this.hashToken(refreshToken);

    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hashedRt },
    });

    return { accessToken, refreshToken };
  }

  async addCustomerRole(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException();
    }

    if (user.roles.includes('customer')) {
      throw new BadRequestException('You already have the customer role');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: { push: 'customer' },
        activeMode: 'customer',
      },
    });

    return this.issueTokens(userId, 'customer');
  }

  async addEmployeeRole(userId: string, dto: EmployeeProfileDTO) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException();
    }

    if (user.roles.includes('employee')) {
      throw new BadRequestException('You already have the employee role');
    }

    const services = await this.prisma.service.findMany({
      where: {
        id: { in: dto.specializationIds },
        ...selectableServiceWhere,
      },
    });

    if (services.length !== dto.specializationIds.length) {
      throw new BadRequestException(
        'One or more specializationIds are invalid',
      );
    }

    const regions = await this.prisma.region.findMany({
      where: { id: { in: dto.regionIds } },
    });

    if (regions.length !== dto.regionIds.length) {
      throw new BadRequestException('One or more regionIds are invalid');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          roles: { push: 'employee' },
          activeMode: 'employee',
        },
      });

      await tx.employeeProfile.create({
        data: {
          userId,
          description: dto.description,
          status: 'available',
          rating: 0,
          completedContracts: 0,
          specialization: {
            connect: dto.specializationIds.map((id) => ({ id })),
          },
          regions: {
            connect: dto.regionIds.map((id) => ({ id })),
          },
        },
      });
    });

    return this.issueTokens(userId, 'employee');
  }

  async switchMode(userId: string, mode: 'customer' | 'employee') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (!user.roles.includes(mode)) {
      throw new ForbiddenException('You do not have this role');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { activeMode: mode },
    });

    return this.issueTokens(userId, mode);
  }

  async logout(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }

  async findUserIdByEmail(email: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });

    return user?.id ?? null;
  }

  async sendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.emailVerified) {
      return;
    }

    const token = await this.tokens.create(
      userId,
      'email_verification',
      24 * 60,
    );

    await this.mail.sendVerification(user.email, token);
  }

  async verifyEmail(token: string) {
    const userId = await this.tokens.consume(token, 'email_verification');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        // Відкликаємо будь-яку refresh-сесію,
        // створену до підтвердження пошти.
        hashedRefreshToken: null,
      },
    });

    return { message: 'Пошту підтверджено' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (user) {
      const token = await this.tokens.create(user.id, 'password_reset', 60);
      void this.mail.sendPasswordReset(user.email, token);
    }

    return {
      message: 'Якщо така пошта зареєстрована, ми надіслали лист',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.tokens.consume(token, 'password_reset');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        hashedRefreshToken: null,
      },
    });

    return { message: 'Пароль змінено' };
  }
}
