import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmployeesQueryDto } from './dto/employees-query.dto';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { CloudinaryService } from './cloudinary.service';
import type { EmployeeMediaType } from './cloudinary.service';
import type { Express } from 'express';

const employeeSelect = {
  id: true,
  rating: true,
  completedContracts: true,
  user: { select: { id: true, name: true } },
  regions: { select: { id: true, name: true } },
  specialization: { select: { id: true, name: true } },
} satisfies Prisma.EmployeeProfileSelect;

const employeeProfileDetailsSelect = {
  ...employeeSelect,
  description: true,
  portfolio: {
    select: {
      id: true,
      url: true,
      type: true,
      caption: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.EmployeeProfileSelect;

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async search(query: EmployeesQueryDto) {
    const where: Prisma.EmployeeProfileWhereInput = {};

    if (query.regionId) {
      where.regions = { some: { id: query.regionId } };
    }

    if (query.serviceId) {
      where.specialization = { some: { id: query.serviceId } };
    }

    if (query.minRating !== undefined) {
      where.rating = { gte: query.minRating };
    }

    if (query.search?.trim()) {
      where.user = {
        name: { contains: query.search.trim(), mode: 'insensitive' },
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employeeProfile.findMany({
        where,
        orderBy: { [query.sortBy]: query.order },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: employeeSelect,
      }),
      this.prisma.employeeProfile.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employeeProfile.findUnique({
      where: { id },
      select: employeeProfileDetailsSelect,
    });

    if (!employee) {
      throw new NotFoundException('Виконавця не знайдено');
    }

    return employee;
  }

  async getMyProfile(userId: string) {
    const profile = await this.prisma.employeeProfile.findUnique({
      where: { userId },
      select: employeeProfileDetailsSelect,
    });

    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    return profile;
  }

  async updateMyProfile(userId: string, dto: UpdateEmployeeProfileDto) {
    if (
      dto.description === undefined &&
      dto.specializationIds === undefined &&
      dto.regionIds === undefined
    ) {
      throw new BadRequestException('At least one profile field is required');
    }

    const profile = await this.prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    const [serviceCount, regionCount] = await Promise.all([
      dto.specializationIds === undefined
        ? 0
        : this.prisma.service.count({
            where: { id: { in: dto.specializationIds } },
          }),
      dto.regionIds === undefined
        ? 0
        : this.prisma.region.count({
            where: { id: { in: dto.regionIds } },
          }),
    ]);

    if (
      dto.specializationIds !== undefined &&
      serviceCount !== dto.specializationIds.length
    ) {
      throw new BadRequestException(
        'One or more specializationIds are invalid',
      );
    }
    if (dto.regionIds !== undefined && regionCount !== dto.regionIds.length) {
      throw new BadRequestException('One or more regionIds are invalid');
    }

    return this.prisma.employeeProfile.update({
      where: { id: profile.id },
      data: {
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.specializationIds !== undefined && {
          specialization: {
            set: dto.specializationIds.map((id) => ({ id })),
          },
        }),
        ...(dto.regionIds !== undefined && {
          regions: { set: dto.regionIds.map((id) => ({ id })) },
        }),
      },
      select: employeeProfileDetailsSelect,
    });
  }

  async uploadMedia(
    userId: string,
    file: Express.Multer.File,
    caption?: string,
  ) {
    const type = this.getMediaType(file.mimetype);
    const profile = await this.prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    const uploaded = await this.cloudinary.upload(file.buffer, type);

    try {
      return await this.prisma.employeeMedia.create({
        data: {
          employeeId: profile.id,
          url: uploaded.url,
          publicId: uploaded.publicId,
          type,
          caption,
        },
        select: {
          id: true,
          url: true,
          type: true,
          caption: true,
          createdAt: true,
        },
      });
    } catch (error) {
      try {
        await this.cloudinary.delete(uploaded.publicId, type);
      } catch (cleanupError) {
        this.logger.error(
          'Failed to remove a Cloudinary upload after database persistence failed',
          cleanupError instanceof Error
            ? cleanupError.stack
            : String(cleanupError),
        );
      }

      throw error;
    }
  }

  async deleteMedia(userId: string, mediaId: string) {
    const profile = await this.prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Employee profile not found');
    }

    const media = await this.prisma.employeeMedia.findFirst({
      where: { id: mediaId, employeeId: profile.id },
      select: { id: true, publicId: true, type: true },
    });
    if (!media) {
      throw new NotFoundException('Media item not found');
    }

    await this.cloudinary.delete(media.publicId, media.type);
    await this.prisma.employeeMedia.delete({ where: { id: media.id } });
  }

  private getMediaType(mimetype: string): EmployeeMediaType {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(mimetype)) {
      return 'image';
    }

    if (['video/mp4', 'video/webm', 'video/quicktime'].includes(mimetype)) {
      return 'video';
    }

    throw new UnsupportedMediaTypeException(
      'Supported media types are JPEG, PNG, WebP, MP4, WebM, and MOV',
    );
  }
}
