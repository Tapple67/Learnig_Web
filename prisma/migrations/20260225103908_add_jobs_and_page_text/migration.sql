-- CreateTable
CREATE TABLE "MaterialPageText" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "charCount" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DONE',
    "error" TEXT,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialPageText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "materialId" TEXT,
    "page" INTEGER,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialPageText_materialId_idx" ON "MaterialPageText"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialPageText_materialId_page_key" ON "MaterialPageText"("materialId", "page");

-- CreateIndex
CREATE INDEX "Job_status_type_priority_createdAt_idx" ON "Job"("status", "type", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "Job_materialId_type_status_idx" ON "Job"("materialId", "type", "status");

-- AddForeignKey
ALTER TABLE "MaterialPageText" ADD CONSTRAINT "MaterialPageText_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
