CREATE TYPE "ContractLocationType" AS ENUM ('coordinates', 'burial_plot', 'address');

ALTER TABLE "Contract"
  ADD COLUMN "locationType" "ContractLocationType" NOT NULL DEFAULT 'coordinates',
  ADD COLUMN "address" TEXT,
  ADD COLUMN "burialPlotId" TEXT;

ALTER TABLE "Contract"
  ALTER COLUMN "positionX" DROP NOT NULL,
  ALTER COLUMN "positionY" DROP NOT NULL;

ALTER TABLE "Contract"
  ADD CONSTRAINT "Contract_burialPlotId_fkey"
  FOREIGN KEY ("burialPlotId") REFERENCES "BurialPlot"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
