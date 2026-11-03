-- CreateIndex
CREATE INDEX "Contract_customerId_idx" ON "Contract"("customerId");

-- CreateIndex
CREATE INDEX "Contract_employeeId_status_idx" ON "Contract"("employeeId", "status");

-- CreateIndex
CREATE INDEX "Contract_regionId_status_createdAt_idx" ON "Contract"("regionId", "status", "createdAt");
