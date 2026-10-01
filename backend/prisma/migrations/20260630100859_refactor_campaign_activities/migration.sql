/*
  Warnings:

  - You are about to drop the column `channel` on the `campaign` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_at` on the `campaign` table. All the data in the column will be lost.
  - You are about to drop the column `template_id` on the `campaign` table. All the data in the column will be lost.
  - You are about to drop the column `campaign_id` on the `campaign_recipient` table. All the data in the column will be lost.
  - You are about to drop the column `channel` on the `campaign_template` table. All the data in the column will be lost.
  - Added the required column `owner_id` to the `campaign` table without a default value. This is not possible if the table is not empty.
  - Made the column `status` on table `campaign` required. This step will fail if there are existing NULL values in that column.
  - Made the column `start_date` on table `campaign` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `activity_id` to the `campaign_recipient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `campaign_template` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('EMAIL', 'SMS', 'ZNS');

-- DropForeignKey
ALTER TABLE "campaign" DROP CONSTRAINT "campaign_template_id_fkey";

-- DropForeignKey
ALTER TABLE "campaign_recipient" DROP CONSTRAINT "campaign_recipient_campaign_id_fkey";

-- AlterTable
ALTER TABLE "campaign" DROP COLUMN "channel",
DROP COLUMN "scheduled_at",
DROP COLUMN "template_id",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "owner_id" INTEGER NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "start_date" SET NOT NULL;

-- AlterTable
ALTER TABLE "campaign_recipient" DROP COLUMN "campaign_id",
ADD COLUMN     "activity_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "campaign_template" DROP COLUMN "channel",
ADD COLUMN     "type" "ActivityType" NOT NULL;

-- DropEnum
DROP TYPE "Channel";

-- CreateTable
CREATE TABLE "campaign_activity" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "type" "ActivityType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255),
    "content" TEXT,
    "template_id" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "scheduled_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_activity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_activity" ADD CONSTRAINT "campaign_activity_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_activity" ADD CONSTRAINT "campaign_activity_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "campaign_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "campaign_activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
