ALTER TABLE "QuizSet"
ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'GENERAL',
ADD COLUMN "sourceAttemptId" TEXT,
ADD COLUMN "sourceTopics" JSONB,
ADD COLUMN "sourceItemIds" JSONB;

CREATE INDEX "QuizSet_purpose_idx" ON "QuizSet"("purpose");
CREATE INDEX "QuizSet_sourceAttemptId_idx" ON "QuizSet"("sourceAttemptId");
