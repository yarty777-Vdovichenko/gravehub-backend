/*
  Warnings:

  - The values [active,finished] on the enum `ContractStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContractStatus_new" AS ENUM ('open', 'in_progress', 'awaiting_confirmation', 'completed', 'cancelled');
ALTER TABLE "Contract" ALTER COLUMN "status" TYPE "ContractStatus_new" USING ("status"::text::"ContractStatus_new");
ALTER TYPE "ContractStatus" RENAME TO "ContractStatus_old";
ALTER TYPE "ContractStatus_new" RENAME TO "ContractStatus";
DROP TYPE "public"."ContractStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Contract" ALTER COLUMN "status" SET DEFAULT 'open';
