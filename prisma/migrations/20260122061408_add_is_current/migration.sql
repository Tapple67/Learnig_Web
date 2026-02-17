-- AlterTable
ALTER TABLE "Grade" ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT false;
