/*
  Warnings:

  - You are about to alter the column `price` on the `Proposal` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - A unique constraint covering the columns `[contractId,employeeId]` on the table `Proposal` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Proposal" DROP CONSTRAINT "Proposal_contractId_fkey";

-- DropForeignKey
ALTER TABLE "Proposal" DROP CONSTRAINT "Proposal_employeeId_fkey";

-- AlterTable
ALTER TABLE "Proposal" ALTER COLUMN "price" SET DATA TYPE INTEGER,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "Proposal_employeeId_idx" ON "Proposal"("employeeId");

-- CreateIndex
CREATE INDEX "Proposal_contractId_status_idx" ON "Proposal"("contractId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_contractId_employeeId_key" ON "Proposal"("contractId", "employeeId");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
