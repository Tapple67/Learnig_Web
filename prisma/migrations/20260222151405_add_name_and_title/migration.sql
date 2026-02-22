/*
  Warnings:

  - Added the required column `materialTitle` to the `ActivityLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subjectName` to the `ActivityLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN     "materialTitle" TEXT NOT NULL,
ADD COLUMN     "subjectName" TEXT NOT NULL;
