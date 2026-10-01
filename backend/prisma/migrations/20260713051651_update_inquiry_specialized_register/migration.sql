/*
  Warnings:

  - You are about to drop the column `first_contact_source` on the `inquiry` table. All the data in the column will be lost.
  - You are about to drop the column `lead_source` on the `inquiry` table. All the data in the column will be lost.
  - You are about to drop the column `interested_major` on the `specialized_register` table. All the data in the column will be lost.
  - You are about to drop the column `specific_major` on the `specialized_register` table. All the data in the column will be lost.
  - The `gpa` column on the `specialized_register` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `program_score` column on the `specialized_register` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MajorLevel" AS ENUM ('interestedMajor', 'specificMajor');

-- AlterTable
ALTER TABLE "inquiry" DROP COLUMN "first_contact_source",
DROP COLUMN "lead_source",
ADD COLUMN     "status_interaction" VARCHAR(100);

-- AlterTable
ALTER TABLE "specialized_register" DROP COLUMN "interested_major",
DROP COLUMN "specific_major",
ADD COLUMN     "interested_major_id" INTEGER,
ADD COLUMN     "specific_major_id" INTEGER,
DROP COLUMN "gpa",
ADD COLUMN     "gpa" "GPA",
DROP COLUMN "program_score",
ADD COLUMN     "program_score" "ProgramScore";

-- DropEnum
DROP TYPE "FirstContactSource";

-- DropEnum
DROP TYPE "LeadSource";

-- DropEnum
DROP TYPE "StatusDetail";

-- DropEnum
DROP TYPE "StatusGeneral";

-- CreateTable
CREATE TABLE "major_data" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "level" "MajorLevel" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "parent_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "major_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "major_data_parent_id_idx" ON "major_data"("parent_id");

-- CreateIndex
CREATE INDEX "major_data_level_idx" ON "major_data"("level");

-- CreateIndex
CREATE UNIQUE INDEX "major_data_name_parent_id_key" ON "major_data"("name", "parent_id");

-- AddForeignKey
ALTER TABLE "major_data" ADD CONSTRAINT "major_data_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "major_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialized_register" ADD CONSTRAINT "specialized_register_interested_major_id_fkey" FOREIGN KEY ("interested_major_id") REFERENCES "major_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialized_register" ADD CONSTRAINT "specialized_register_specific_major_id_fkey" FOREIGN KEY ("specific_major_id") REFERENCES "major_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;
