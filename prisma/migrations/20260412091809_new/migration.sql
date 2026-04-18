-- AlterTable
ALTER TABLE "QuizItem" ADD COLUMN     "topic" TEXT;

-- CreateIndex
CREATE INDEX "QuizItem_topic_idx" ON "QuizItem"("topic");
