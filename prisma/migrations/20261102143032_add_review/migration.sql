/*
  Warnings:

  - A unique constraint covering the columns `[contractId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN     "reviewsCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "rating" SET DEFAULT 0,
ALTER COLUMN "completedContracts" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Review_contractId_key" ON "Review"("contractId");

-- CreateIndex
CREATE INDEX "Review_employeeId_createdAt_idx" ON "Review"("employeeId", "createdAt");
