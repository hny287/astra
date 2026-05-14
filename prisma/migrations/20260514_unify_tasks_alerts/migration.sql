-- Migration: Unify Tasks and Alerts
-- - Replace AlertStatus + TaskStatus with ItemStatus
-- - Replace TaskPriority with Severity
-- - Add rich scanner fields to Task
-- - Add cvssScore to Finding
-- - Make Finding.scanId nullable
-- - Remove @@unique([fingerprint, scanId]) from Finding

-- Step 1: Migrate data BEFORE type change
-- AlertStatus CONFIRMED -> IN_PROGRESS (valid in both enums)
-- AlertStatus REMEDIATED -> COMPLETED is NOT valid in AlertStatus, so use IN_PROGRESS as interim
UPDATE "Finding" SET status = 'IN_PROGRESS' WHERE status = 'CONFIRMED';
-- REMEDIATED -> map to ACCEPTED_RISK temporarily (valid in AlertStatus), then fix after type change
UPDATE "Finding" SET status = 'ACCEPTED_RISK' WHERE status = 'REMEDIATED';
-- TaskStatus DUPLICATE -> CANCELLED (valid in TaskStatus)
UPDATE "Task" SET status = 'CANCELLED' WHERE status = 'DUPLICATE';

-- Step 2: Create new ItemStatus enum
CREATE TYPE "ItemStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'FALSE_POSITIVE', 'ACCEPTED_RISK', 'BLOCKED', 'CANCELLED');

-- Step 3: Change column types (all current values now valid in ItemStatus)
ALTER TABLE "Finding" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Finding" ALTER COLUMN "status" TYPE "ItemStatus" USING "status"::text::"ItemStatus";
ALTER TABLE "Finding" ALTER COLUMN "status" SET DEFAULT 'OPEN';

ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "ItemStatus" USING "status"::text::"ItemStatus";
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- Step 4: Drop old enum types
DROP TYPE IF EXISTS "AlertStatus";
DROP TYPE IF EXISTS "TaskStatus";

-- Step 5: Rename Task.priority to severity
ALTER TABLE "Task" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "priority" TYPE "Severity" USING "priority"::text::"Severity";
ALTER TABLE "Task" RENAME COLUMN "priority" TO "severity";
ALTER TABLE "Task" ALTER COLUMN "severity" SET DEFAULT 'MEDIUM';

-- Step 6: Drop TaskPriority enum
DROP TYPE IF EXISTS "TaskPriority";

-- Step 7: Add cvssScore to Finding
ALTER TABLE "Finding" ADD COLUMN "cvssScore" DOUBLE PRECISION;

-- Step 8: Make Finding.scanId nullable
ALTER TABLE "Finding" ALTER COLUMN "scanId" DROP NOT NULL;

-- Step 9: Drop the unique constraint on (fingerprint, scanId)
ALTER TABLE "Finding" DROP CONSTRAINT IF EXISTS "Finding_fingerprint_scanId_key";

-- Step 10: Add rich fields to Task
ALTER TABLE "Task" ADD COLUMN "scanner" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Task" ADD COLUMN "ruleId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Task" ADD COLUMN "file" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Task" ADD COLUMN "lineStart" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "lineEnd" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Task" ADD COLUMN "codeSnippet" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Task" ADD COLUMN "language" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Task" ADD COLUMN "cwe" TEXT[] DEFAULT '{}';
ALTER TABLE "Task" ADD COLUMN "owasp" TEXT[] DEFAULT '{}';
ALTER TABLE "Task" ADD COLUMN "aiExplanation" TEXT;
ALTER TABLE "Task" ADD COLUMN "aiFix" TEXT;
ALTER TABLE "Task" ADD COLUMN "exploitationScenario" TEXT;
ALTER TABLE "Task" ADD COLUMN "exploitScore" DOUBLE PRECISION;
ALTER TABLE "Task" ADD COLUMN "cvssScore" DOUBLE PRECISION;
ALTER TABLE "Task" ADD COLUMN "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "Task" ADD COLUMN "remediation" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Task" ADD COLUMN "category" "Category";

-- Step 11: Add index for Task.severity
CREATE INDEX "Task_severity_idx" ON "Task"("severity");