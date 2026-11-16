CREATE TYPE "EmployeeMediaType" AS ENUM ('image', 'video');

CREATE TABLE "EmployeeMedia" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "type" "EmployeeMediaType" NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeMedia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployeeMedia_employeeId_createdAt_idx"
    ON "EmployeeMedia"("employeeId", "createdAt");

ALTER TABLE "EmployeeMedia"
    ADD CONSTRAINT "EmployeeMedia_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
