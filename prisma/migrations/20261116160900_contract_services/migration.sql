-- Create the implicit many-to-many relation while preserving existing contract services.
CREATE TABLE "_ContractServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContractServices_AB_pkey" PRIMARY KEY ("A", "B")
);

INSERT INTO "_ContractServices" ("A", "B")
SELECT "id", "serviceTypeId" FROM "Contract";

CREATE INDEX "_ContractServices_B_index" ON "_ContractServices"("B");

ALTER TABLE "Contract" DROP CONSTRAINT "Contract_serviceTypeId_fkey";
ALTER TABLE "Contract" DROP COLUMN "serviceTypeId";

ALTER TABLE "_ContractServices"
    ADD CONSTRAINT "_ContractServices_A_fkey"
    FOREIGN KEY ("A") REFERENCES "Contract"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ContractServices"
    ADD CONSTRAINT "_ContractServices_B_fkey"
    FOREIGN KEY ("B") REFERENCES "Service"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
