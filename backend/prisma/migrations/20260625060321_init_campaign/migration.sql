-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('SMS', 'EMAIL_MARKETING');

-- CreateEnum
CREATE TYPE "GPA" AS ENUM ('LOWER_21', 'GRADE_11_FROM_21_TO_23', 'GRADE_12_CUR_2_FROM_24_TO_25', 'GRADE_12_FROM_21_TO_23', 'GRADE_11_FROM_24_TO_26', 'GRADE_12_FROM_24_TO_26', 'GRADE_11_HIGHER_26', 'GRADE_12_CUR_1_HIGHER_26', 'GRADE_12_HIGHER_26');

-- CreateEnum
CREATE TYPE "ProgramScore" AS ENUM ('MATH_G11_HIGHER_7', 'MATH_G11_CUR1_HIGHER_7', 'MATH_G12_HIGHER_7', 'PHY_G11_HIGHER_7', 'PHY_G12_CUR1_HIGHER_7', 'PHY_G12_HIGHER_7', 'CHEM_G11_HIGHER_7', 'CHEM_G12_CUR1_HIGHER_7', 'CHEM_G12_HIGHER_7');

-- CreateTable
CREATE TABLE "campaign" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "channel" "Channel" NOT NULL,
    "status" VARCHAR(50),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_recipient" (
    "id" SERIAL NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "inquiry_id" INTEGER NOT NULL,
    "email" VARCHAR(255),
    "mobile" VARCHAR(20),
    "full_name" VARCHAR(255),
    "status" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_template" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "channel" "Channel" NOT NULL,
    "subject" VARCHAR(255),
    "content" TEXT NOT NULL,
    "is_actived" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_template_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "campaign_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_template" ADD CONSTRAINT "campaign_template_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
