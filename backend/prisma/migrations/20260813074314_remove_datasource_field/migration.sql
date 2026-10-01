/*
  Warnings:

  - You are about to drop the column `data_source` on the `inquiry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inquiry" DROP COLUMN "data_source";

-- DropEnum
DROP TYPE "DataSource";
