import { Prisma } from '@prisma/client';

export const selectableServiceWhere = {
  parentId: { not: null },
  price: { not: null },
  children: { none: {} },
} satisfies Prisma.ServiceWhereInput;

export const leafServiceSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  parentId: true,
} satisfies Prisma.ServiceSelect;
