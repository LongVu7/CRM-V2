/*
  Warnings:

  - You are about to drop the column `english_certificate` on the `student` table. All the data in the column will be lost.
  - You are about to drop the column `gpa` on the `student` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[specialized_register_id]` on the table `student` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EnglishCertificate" AS ENUM ('IELTS', 'TOEFL', 'TOEIC', 'VSTEP', 'APTIS', 'LINGUASKILL', 'PEIC', 'CAMBRIDGE_EXAM', 'PTE', 'other');

-- AlterTable
ALTER TABLE "student" DROP COLUMN "english_certificate",
DROP COLUMN "gpa",
ADD COLUMN     "specialized_register_id" INTEGER;

-- CreateTable
CREATE TABLE "specialized_register" (
    "id" SERIAL NOT NULL,
    "interested_major" VARCHAR(255),
    "specific_major" VARCHAR(255),
    "admission_year" INTEGER,
    "english_certificate" "EnglishCertificate",
    "gpa" DECIMAL(4,2),
    "program_score" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialized_register_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_specialized_register_id_key" ON "student"("specialized_register_id");

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_specialized_register_id_fkey" FOREIGN KEY ("specialized_register_id") REFERENCES "specialized_register"("id") ON DELETE SET NULL ON UPDATE CASCADE;
