import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  const findContract = jest.fn();
  const createReview = jest.fn();
  const aggregateReviews = jest.fn();
  const updateEmployee = jest.fn();
  const findReviews = jest.fn();
  const countReviews = jest.fn();
  const transaction = jest.fn();
  const tx = {
    review: { create: createReview, aggregate: aggregateReviews },
    employeeProfile: { update: updateEmployee },
  };
  let service: ReviewsService;

  beforeEach(async () => {
    findContract.mockReset();
    createReview.mockReset();
    aggregateReviews.mockReset();
    updateEmployee.mockReset();
    findReviews.mockReset();
    countReviews.mockReset();
    transaction.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: {
            contract: { findFirst: findContract },
            review: { findMany: findReviews, count: countReviews },
            employeeProfile: { findUnique: jest.fn() },
            $transaction: transaction,
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ReviewsService);
  });

  it('creates a review and updates the employee rating aggregate', async () => {
    const review = { id: 'review-1', rating: 5, text: 'Excellent work' };
    findContract.mockResolvedValue({
      status: 'completed',
      employeeId: 'employee-1',
    });
    createReview.mockResolvedValue(review);
    aggregateReviews.mockResolvedValue({ _avg: { rating: 4.666 } });
    transaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );

    await expect(
      service.create('contract-1', 'customer-1', {
        rating: 5,
        text: 'Excellent work',
      }),
    ).resolves.toEqual(review);

    expect(createReview).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          contractId: 'contract-1',
          employeeId: 'employee-1',
          customerId: 'customer-1',
          rating: 5,
          text: 'Excellent work',
        },
      }),
    );
    expect(updateEmployee).toHaveBeenLastCalledWith({
      where: { id: 'employee-1' },
      data: { rating: 4.67 },
    });
  });

  it('rejects reviews for contracts that are not completed', async () => {
    findContract.mockResolvedValue({
      status: 'in_progress',
      employeeId: 'employee-1',
    });

    await expect(
      service.create('contract-1', 'customer-1', {
        rating: 5,
        text: 'Excellent work',
      }),
    ).rejects.toThrow(ConflictException);
    expect(transaction).not.toHaveBeenCalled();
    expect(createReview).not.toHaveBeenCalled();
  });

  it('rejects review requests for a contract the customer does not own', async () => {
    findContract.mockResolvedValue(null);

    await expect(
      service.create('contract-1', 'customer-1', {
        rating: 5,
        text: 'Excellent work',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
