/*
  Warnings:

  - You are about to drop the column `city` on the `Contract` table. All the data in the column will be lost.
  - Added the required column `regionId` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "city",
ADD COLUMN     "regionId" TEXT NOT NULL,
ALTER COLUMN "positionX" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "positionY" SET DATA TYPE DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
