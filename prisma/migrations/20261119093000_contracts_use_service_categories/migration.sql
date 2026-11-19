-- Contracts now store parent categories instead of selected leaf services.
-- Preserve each contract's requested scope when several previous leaves share a parent.
INSERT INTO "_ContractServices" ("A", "B")
SELECT contract_service."A", service."parentId"
FROM "_ContractServices" AS contract_service
JOIN "Service" AS service ON service."id" = contract_service."B"
WHERE service."parentId" IS NOT NULL
ON CONFLICT ("A", "B") DO NOTHING;

DELETE FROM "_ContractServices" AS contract_service
USING "Service" AS service
WHERE contract_service."B" = service."id"
  AND service."parentId" IS NOT NULL;
