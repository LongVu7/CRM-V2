/*
  Warnings:

  - Added the required column `school_type` to the `school` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('A_STAR', 'A', 'B', 'C', 'D');

-- AlterTable
ALTER TABLE "school" DROP COLUMN "school_type",
ADD COLUMN     "school_type" "SchoolType" NOT NULL;
