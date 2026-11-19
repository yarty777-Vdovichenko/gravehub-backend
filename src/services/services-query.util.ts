import { Prisma } from '@prisma/client';

export const selectableServiceWhere = {
  parentId: { not: null },
  price: { not: null },
  children: { none: {} },
} satisfies Prisma.ServiceWhereInput;

export const serviceCategoryWhere = {
  parentId: null,
  children: { some: selectableServiceWhere },
} satisfies Prisma.ServiceWhereInput;

export const serviceCategoryInclude = {
  children: {
    where: selectableServiceWhere,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
    },
  },
} satisfies Prisma.ServiceInclude;
