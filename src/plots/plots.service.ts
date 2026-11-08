import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { calculateCredit } from './credit';
import { CreditPreviewDto, PurchasePlotDto } from './dto/purchase-plot.dto';

const RESERVATION_MINUTES = 10;

@Injectable()
export class PlotsService {
  constructor(private readonly prisma: PrismaService) {}

  findCemeteries() {
    return this.prisma.cemetery.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        latitude: true,
        longitude: true,
      },
    });
  }

  async findPlots(cemeteryId: string) {
    const now = new Date();
    const plots = await this.prisma.burialPlot.findMany({
      where: { cemeteryId },
      orderBy: [{ positionX: 'asc' }, { positionY: 'asc' }],
      select: {
        id: true,
        positionX: true,
        positionY: true,
        price: true,
        status: true,
        reservedUntil: true,
      },
    });

    // прострочена резервація для клієнта виглядає як вільне місце
    return plots.map(({ reservedUntil, ...p }) => ({
      ...p,
      status:
        p.status === 'reserved' && reservedUntil && reservedUntil < now
          ? 'available'
          : p.status,
    }));
  }

  async reserve(plotId: string, userId: string) {
    const now = new Date();
    const until = new Date(now.getTime() + RESERVATION_MINUTES * 60 * 1000);

    const result = await this.prisma.burialPlot.updateMany({
      where: {
        id: plotId,
        OR: [
          { status: 'available' },
          { status: 'reserved', reservedUntil: { lt: now } },
        ],
      },
      data: { status: 'reserved', reservedById: userId, reservedUntil: until },
    });

    if (result.count === 0) {
      await this.ensureExists(plotId);
      throw new ConflictException('Місце вже зарезервоване або продане');
    }
    return { plotId, reservedUntil: until };
  }

  async release(plotId: string, userId: string) {
    const result = await this.prisma.burialPlot.updateMany({
      where: { id: plotId, status: 'reserved', reservedById: userId },
      data: { status: 'available', reservedById: null, reservedUntil: null },
    });
    if (result.count === 0) {
      throw new NotFoundException('Активної резервації не знайдено');
    }
  }

  async creditPreview(plotId: string, dto: CreditPreviewDto) {
    const plot = await this.ensureExists(plotId);
    if (dto.downPayment >= plot.price) {
      throw new BadRequestException(
        'Перший внесок має бути меншим за ціну місця',
      );
    }
    return calculateCredit(plot.price, dto.downPayment, dto.months);
  }

  async purchase(plotId: string, userId: string, dto: PurchasePlotDto) {
    const plot = await this.ensureExists(plotId);

    let credit: ReturnType<typeof calculateCredit> | null = null;
    if (dto.paymentType === 'credit') {
      if (!dto.months) throw new BadRequestException('Вкажіть строк кредиту');
      const down = dto.downPayment ?? 0;
      if (down >= plot.price) {
        throw new BadRequestException(
          'Перший внесок має бути меншим за ціну місця',
        );
      }
      credit = calculateCredit(plot.price, down, dto.months);
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.burialPlot.updateMany({
        where: {
          id: plotId,
          status: 'reserved',
          reservedById: userId,
          reservedUntil: { gt: now },
        },
        data: {
          status: 'sold',
          ownerId: userId,
          reservedById: null,
          reservedUntil: null,
        },
      });

      if (updated.count === 0) {
        throw new ConflictException('Резервація відсутня або закінчилась');
      }

      return tx.plotPurchase.create({
        data: {
          plotId,
          userId,
          price: plot.price,
          paymentType: dto.paymentType,
          creditMonths: credit?.months,
          downPayment: credit?.downPayment,
          monthlyPayment: credit?.monthlyPayment,
        },
      });
    });
  }

  findMine(userId: string) {
    return this.prisma.burialPlot.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        positionX: true,
        positionY: true,
        price: true,
        cemetery: { select: { id: true, name: true, city: true } },
        purchase: {
          select: {
            paymentType: true,
            creditMonths: true,
            monthlyPayment: true,
            createdAt: true,
          },
        },
      },
    });
  }

  private async ensureExists(plotId: string) {
    const plot = await this.prisma.burialPlot.findUnique({
      where: { id: plotId },
    });
    if (!plot) throw new NotFoundException('Місце не знайдено');
    return plot;
  }
}
