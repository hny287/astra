-- Add repo intel and architecture diagram columns to Scan
ALTER TABLE "Scan" ADD COLUMN "repoIntel" JSONB;
ALTER TABLE "Scan" ADD COLUMN "architectureDiagram" TEXT;
ALTER TABLE "Scan" ADD COLUMN "toolFindingsCount" INTEGER NOT NULL DEFAULT 0;