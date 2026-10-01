/*
  Warnings:

  - You are about to drop the column `inquiry_id` on the `student` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[student_id]` on the table `inquiry` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "student" DROP CONSTRAINT "student_inquiry_id_fkey";

-- AlterTable
ALTER TABLE "inquiry" ADD COLUMN     "student_id" INTEGER;

-- AlterTable
ALTER TABLE "student" DROP COLUMN "inquiry_id";

-- CreateIndex
CREATE UNIQUE INDEX "inquiry_student_id_key" ON "inquiry"("student_id");

-- AddForeignKey
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
