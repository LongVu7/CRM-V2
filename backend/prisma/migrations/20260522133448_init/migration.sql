-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('online', 'direct', 'database', 'referal', 'internal', 'onlineMass', 'resonance', 'other');

-- CreateEnum
CREATE TYPE "StatusGeneral" AS ENUM ('new', 'assigned', 'inProcess', 'converted', 'dead');

-- CreateEnum
CREATE TYPE "StatusDetail" AS ENUM ('interested', 'considered', 'contactLater', 'kbm', 'notContacted', 'applied');

-- CreateEnum
CREATE TYPE "FirstContactSource" AS ENUM ('tele', 'walkIn', 'online', 'incomingPhone');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('webGame', 'holland', 'roadShowCity', 'roadShowProvince', 'acquireCity', 'acquireProvince', 'cityInquiry', 'provinceInquiry', 'partnership', 'income', 'openDayInquiry', 'eventInquiry', 'activeContact');

-- CreateEnum
CREATE TYPE "Regional" AS ENUM ('kv1', 'kv2', 'kv3', 'kv4', 'kv5', 'kv6');

-- CreateTable
CREATE TABLE "account" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER,
    "group_id" INTEGER,
    "password" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry" (
    "id" SERIAL NOT NULL,
    "assigned_to_id" INTEGER,
    "status_general" VARCHAR(100),
    "status_detail" VARCHAR(255),
    "lead_source" VARCHAR(255),
    "first_contact_source" VARCHAR(255),
    "priority" VARCHAR(50),
    "description" TEXT,
    "data_received" DATE,
    "data_source" VARCHAR(255),
    "regional" VARCHAR(10),
    "group_tele" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student" (
    "id" SERIAL NOT NULL,
    "inquiry_id" INTEGER,
    "full_name" VARCHAR(255) NOT NULL,
    "gender" VARCHAR(20),
    "email" VARCHAR(255),
    "mobile" VARCHAR(20),
    "other_phone" VARCHAR(20),
    "birth_date" DATE,
    "gpa" DECIMAL(4,2),
    "english_certificate" VARCHAR(255),
    "parent_phone" VARCHAR(20),
    "primary_address_city" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_group" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "group_leader" INTEGER,

    CONSTRAINT "user_group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "student_email_key" ON "student"("email");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "user_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student" ADD CONSTRAINT "student_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_group_leader_fkey" FOREIGN KEY ("group_leader") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
