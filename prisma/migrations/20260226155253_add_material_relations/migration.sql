-- CreateTable
CREATE TABLE "MaterialSummary" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSet" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "summaryId" TEXT,
    "sourceHash" TEXT NOT NULL,
    "title" TEXT,
    "quizJson" JSONB NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSummary_materialId_key" ON "MaterialSummary"("materialId");

-- CreateIndex
CREATE INDEX "MaterialSummary_materialId_idx" ON "MaterialSummary"("materialId");

-- CreateIndex
CREATE INDEX "MaterialSummary_sourceHash_idx" ON "MaterialSummary"("sourceHash");

-- CreateIndex
CREATE INDEX "QuizSet_materialId_createdAt_idx" ON "QuizSet"("materialId", "createdAt");

-- CreateIndex
CREATE INDEX "QuizSet_sourceHash_idx" ON "QuizSet"("sourceHash");

-- AddForeignKey
ALTER TABLE "MaterialSummary" ADD CONSTRAINT "MaterialSummary_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSet" ADD CONSTRAINT "QuizSet_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
