-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('FILE_UPLOAD', 'NOTE_EDIT');

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "gradeId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "page" INTEGER,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_userId_updatedAt_idx" ON "ActivityLog"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLog_userId_materialId_page_type_key" ON "ActivityLog"("userId", "materialId", "page", "type");
