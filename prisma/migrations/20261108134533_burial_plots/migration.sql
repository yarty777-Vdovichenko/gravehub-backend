/*
  Warnings:

  - The `status` column on the `BurialPlot` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Cemetry` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[cemeteryId,positionX,positionY]` on the table `BurialPlot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `price` to the `BurialPlot` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PlotStatus" AS ENUM ('available', 'reserved', 'sold');

-- DropForeignKey
ALTER TABLE "BurialPlot" DROP CONSTRAINT "BurialPlot_cemeteryId_fkey";

-- AlterTable
ALTER TABLE "BurialPlot" ADD COLUMN     "price" INTEGER NOT NULL,
ADD COLUMN     "reservedById" TEXT,
ADD COLUMN     "reservedUntil" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "PlotStatus" NOT NULL DEFAULT 'available';

-- DropTable
DROP TABLE "Cemetry";

-- DropEnum
DROP TYPE "BurialStatus";

-- CreateTable
CREATE TABLE "Cemetery" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Cemetery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlotPurchase" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "paymentType" TEXT NOT NULL,
    "creditMonths" INTEGER,
    "downPayment" INTEGER,
    "monthlyPayment" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlotPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlotPurchase_plotId_key" ON "PlotPurchase"("plotId");

-- CreateIndex
CREATE UNIQUE INDEX "BurialPlot_cemeteryId_positionX_positionY_key" ON "BurialPlot"("cemeteryId", "positionX", "positionY");

-- AddForeignKey
ALTER TABLE "BurialPlot" ADD CONSTRAINT "BurialPlot_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BurialPlot" ADD CONSTRAINT "BurialPlot_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlotPurchase" ADD CONSTRAINT "PlotPurchase_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "BurialPlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlotPurchase" ADD CONSTRAINT "PlotPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
