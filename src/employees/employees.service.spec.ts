import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';
import { EmployeesService } from './employees.service';
import { EmployeesQueryDto } from './dto/employees-query.dto';

describe('EmployeesService search by service category', () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const transaction = jest.fn();
  let service: EmployeesService;

  beforeEach(async () => {
    findMany.mockReset();
    count.mockReset();
    transaction.mockReset();
    transaction.mockResolvedValue([[], 0]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: PrismaService,
          useValue: {
            employeeProfile: { findMany, count },
            $transaction: transaction,
          },
        },
        {
          provide: CloudinaryService,
          useValue: { upload: jest.fn(), delete: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(EmployeesService);
  });

  it('filters employees by the selected parent category', async () => {
    const query = Object.assign(new EmployeesQueryDto(), {
      serviceId: 'category-1',
    });

    await expect(service.search(query)).resolves.toEqual({
      items: [],
      meta: { total: 0, page: 1, limit: 10, pages: 0 },
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          specialization: { some: { parentId: 'category-1' } },
        },
      }),
    );
  });
});
