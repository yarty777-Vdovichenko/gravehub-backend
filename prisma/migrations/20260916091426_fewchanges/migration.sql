/*
  Warnings:

  - You are about to drop the column `specializationId` on the `EmployeeProfile` table. All the data in the column will be lost.
  - You are about to drop the `Regions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_EmployeeProfileToRegions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EmployeeProfile" DROP CONSTRAINT "EmployeeProfile_specializationId_fkey";

-- DropForeignKey
ALTER TABLE "_EmployeeProfileToRegions" DROP CONSTRAINT "_EmployeeProfileToRegions_A_fkey";

-- DropForeignKey
ALTER TABLE "_EmployeeProfileToRegions" DROP CONSTRAINT "_EmployeeProfileToRegions_B_fkey";

-- AlterTable
ALTER TABLE "EmployeeProfile" DROP COLUMN "specializationId";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "hashedRefreshToken" DROP NOT NULL;

-- DropTable
DROP TABLE "Regions";

-- DropTable
DROP TABLE "_EmployeeProfileToRegions";

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmployeeProfileToRegion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EmployeeProfileToRegion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EmployeeProfileToService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EmployeeProfileToService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EmployeeProfileToRegion_B_index" ON "_EmployeeProfileToRegion"("B");

-- CreateIndex
CREATE INDEX "_EmployeeProfileToService_B_index" ON "_EmployeeProfileToService"("B");

-- AddForeignKey
ALTER TABLE "_EmployeeProfileToRegion" ADD CONSTRAINT "_EmployeeProfileToRegion_A_fkey" FOREIGN KEY ("A") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeProfileToRegion" ADD CONSTRAINT "_EmployeeProfileToRegion_B_fkey" FOREIGN KEY ("B") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeProfileToService" ADD CONSTRAINT "_EmployeeProfileToService_A_fkey" FOREIGN KEY ("A") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeProfileToService" ADD CONSTRAINT "_EmployeeProfileToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
