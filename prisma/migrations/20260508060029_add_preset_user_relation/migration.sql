-- AlterTable
ALTER TABLE "Preset" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "Preset_userId_idx" ON "Preset"("userId");

-- AddForeignKey
ALTER TABLE "Preset" ADD CONSTRAINT "Preset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
