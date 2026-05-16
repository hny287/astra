-- AddRuleEngine
-- Add rule type, scope, and lifecycle enums
CREATE TYPE "RuleType" AS ENUM ('SECURITY', 'COMPLIANCE', 'SLA', 'BUSINESS_LOGIC');
CREATE TYPE "RuleScope" AS ENUM ('GLOBAL', 'PROJECT');
CREATE TYPE "RuleScopeStatus" AS ENUM ('ACTIVE', 'DRAFT', 'DEPRECATED');

-- Extend UserRule with rule engine fields
ALTER TABLE "UserRule" ADD COLUMN "type" "RuleType" NOT NULL DEFAULT 'SECURITY';
ALTER TABLE "UserRule" ADD COLUMN "scope" "RuleScope" NOT NULL DEFAULT 'GLOBAL';
ALTER TABLE "UserRule" ADD COLUMN "repoUrl" TEXT;
ALTER TABLE "UserRule" ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserRule" ADD COLUMN "paths" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserRule" ADD COLUMN "excludePaths" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserRule" ADD COLUMN "matchPattern" TEXT;
ALTER TABLE "UserRule" ADD COLUMN "slaSeverity" TEXT;
ALTER TABLE "UserRule" ADD COLUMN "slaHours" INTEGER;
ALTER TABLE "UserRule" ADD COLUMN "slaAction" TEXT;
ALTER TABLE "UserRule" ADD COLUMN "owasp" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserRule" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserRule" ADD COLUMN "fixSuggestion" TEXT;
ALTER TABLE "UserRule" ADD COLUMN "references" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserRule" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "UserRule" ADD COLUMN "codeRule" TEXT;
ALTER TABLE "UserRule" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "UserRule" ADD COLUMN "status" "RuleScopeStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "UserRule" ADD COLUMN "enabledAt" TIMESTAMP(3);
ALTER TABLE "UserRule" ADD COLUMN "lastUsedAt" TIMESTAMP(3);
ALTER TABLE "UserRule" ADD COLUMN "userId" TEXT;

-- Add SLA deadline to Finding
ALTER TABLE "Finding" ADD COLUMN "slaDeadline" TIMESTAMP(3);

-- Add foreign key for UserRule -> User
ALTER TABLE "UserRule" ADD CONSTRAINT "UserRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add new indexes
CREATE INDEX "UserRule_scope_idx" ON "UserRule"("scope");
CREATE INDEX "UserRule_category_idx" ON "UserRule"("category");
CREATE INDEX "UserRule_severity_idx" ON "UserRule"("severity");
CREATE INDEX "UserRule_priority_idx" ON "UserRule"("priority");
CREATE INDEX "UserRule_type_idx" ON "UserRule"("type");