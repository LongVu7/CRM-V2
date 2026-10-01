-- CreateEnum
CREATE TYPE "ErrorReportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateTable
CREATE TABLE "error_report" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "status" "ErrorReportStatus" NOT NULL DEFAULT 'OPEN',
    "reported_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_report_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "error_report" ADD CONSTRAINT "error_report_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
