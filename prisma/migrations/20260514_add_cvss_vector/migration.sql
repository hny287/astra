-- Add cvssVector column to Finding and Task
ALTER TABLE "Finding" ADD COLUMN "cvssVector" TEXT;
ALTER TABLE "Task" ADD COLUMN "cvssVector" TEXT;