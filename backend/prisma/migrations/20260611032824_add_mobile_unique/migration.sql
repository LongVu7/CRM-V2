/*
  Warnings:

  - A unique constraint covering the columns `[mobile]` on the table `student` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "student_email_key";

-- CreateIndex
CREATE INDEX "inquiry_created_at_idx" ON "inquiry"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "student_mobile_key" ON "student"("mobile");

-- CreateIndex
CREATE INDEX "student_mobile_idx" ON "student"("mobile");
