/*
  Warnings:

  - A unique constraint covering the columns `[subjectId,week]` on the table `Material` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Material_week_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Material_subjectId_week_key" ON "Material"("subjectId", "week");
