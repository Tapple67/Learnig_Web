-- AlterTable
ALTER TABLE "MaterialSummary" ADD COLUMN     "adaptive" TEXT,
ADD COLUMN     "canonical" TEXT,
ADD COLUMN     "signalsDigest" TEXT,
ADD COLUMN     "summaryType" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "signals" JSONB,
ADD COLUMN     "signalsVer" TEXT;

-- AlterTable
ALTER TABLE "QuizItem" ADD COLUMN     "evidence" JSONB,
ADD COLUMN     "signalHits" JSONB;
