import { Prisma } from '@prisma/client';

export const selectableServiceWhere = {
  parentId: { not: null },
  price: { not: null },
  children: { none: {} },
} satisfies Prisma.ServiceWhereInput;
