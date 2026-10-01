-- CreateEnum
CREATE TYPE "SourceLevel" AS ENUM ('source', 'sourceDetail', 'approachMethod');

-- AlterTable
ALTER TABLE "inquiry" ADD COLUMN     "source_data_id" INTEGER;

-- CreateTable
CREATE TABLE "source_data" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "level" "SourceLevel" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "parent_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "source_data_parent_id_idx" ON "source_data"("parent_id");

-- CreateIndex
CREATE INDEX "source_data_level_idx" ON "source_data"("level");

-- CreateIndex
CREATE UNIQUE INDEX "source_data_name_parent_id_key" ON "source_data"("name", "parent_id");

-- CreateIndex
CREATE INDEX "inquiry_source_data_id_idx" ON "inquiry"("source_data_id");

-- AddForeignKey
ALTER TABLE "inquiry" ADD CONSTRAINT "inquiry_source_data_id_fkey" FOREIGN KEY ("source_data_id") REFERENCES "source_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_data" ADD CONSTRAINT "source_data_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "source_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;
