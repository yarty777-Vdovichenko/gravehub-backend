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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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
        where: { id: { in: specializationIds } },
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
              regions: { connect: regionIds.map((id) => ({ id })) },
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

    return this.issueTokens(userId, dto.role);
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.hashedRefreshToken) throw new UnauthorizedException();

    const matches = this.hashToken(refreshToken) === user.hashedRefreshToken;
    if (!matches) throw new UnauthorizedException();

    return this.issueTokens(user.id, user.activeMode);
  }
  private async issueTokens(userId: string, role: string) {
    const payload = { sub: userId, role };
    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException();

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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException();

    if (user.roles.includes('employee')) {
      throw new BadRequestException('You already have the employee role');
    }

    const services = await this.prisma.service.findMany({
      where: { id: { in: dto.specializationIds } },
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
          regions: { connect: dto.regionIds.map((id) => ({ id })) },
        },
      });
    });

    return this.issueTokens(userId, 'employee');
  }
  async logout(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }
}
