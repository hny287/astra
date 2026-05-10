-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('SAST', 'SCA', 'SECRETS', 'IAC', 'DATA_FLOW', 'BUSINESS_LOGIC');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('CANDIDATE', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "branch" TEXT NOT NULL DEFAULT 'main',
    "commitSha" TEXT,
    "status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "configJson" JSONB NOT NULL,
    "durationSeconds" INTEGER,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "scanner" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "severity" "Severity" NOT NULL,
    "category" "Category" NOT NULL,
    "file" TEXT NOT NULL,
    "lineStart" INTEGER NOT NULL DEFAULT 0,
    "lineEnd" INTEGER NOT NULL DEFAULT 0,
    "codeSnippet" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT '',
    "cwe" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "owasp" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiExplanation" TEXT,
    "aiFix" TEXT,
    "exploitScore" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "remediation" TEXT NOT NULL DEFAULT '',
    "rawJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessLogicRule" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "ruleText" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidenceFiles" TEXT[],
    "status" "RuleStatus" NOT NULL DEFAULT 'CANDIDATE',
    "violationDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessLogicRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeOutput" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "node" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "nodeConfig" JSONB NOT NULL,
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "thinkingTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "configJson" JSONB NOT NULL,
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scan_status_idx" ON "Scan"("status");

-- CreateIndex
CREATE INDEX "Scan_createdAt_idx" ON "Scan"("createdAt");

-- CreateIndex
CREATE INDEX "Finding_scanId_idx" ON "Finding"("scanId");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");

-- CreateIndex
CREATE INDEX "Finding_category_idx" ON "Finding"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Finding_fingerprint_scanId_key" ON "Finding"("fingerprint", "scanId");

-- CreateIndex
CREATE INDEX "BusinessLogicRule_scanId_idx" ON "BusinessLogicRule"("scanId");

-- CreateIndex
CREATE INDEX "NodeOutput_scanId_idx" ON "NodeOutput"("scanId");

-- CreateIndex
CREATE INDEX "NodeOutput_node_idx" ON "NodeOutput"("node");

-- CreateIndex
CREATE UNIQUE INDEX "Preset_name_key" ON "Preset"("name");

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessLogicRule" ADD CONSTRAINT "BusinessLogicRule_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeOutput" ADD CONSTRAINT "NodeOutput_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
