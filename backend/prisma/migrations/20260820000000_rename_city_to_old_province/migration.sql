

-- Rename table and column
ALTER TABLE "city" RENAME TO "old_province";
ALTER TABLE "school" RENAME COLUMN "city_id" TO "old_province_id";

-- Rename Constraints and Indexes
ALTER INDEX "city_pkey" RENAME TO "old_province_pkey";
ALTER INDEX "school_city_id_idx" RENAME TO "school_old_province_id_idx";
ALTER INDEX "school_name_city_id_key" RENAME TO "school_name_old_province_id_key";
ALTER TABLE "school" RENAME CONSTRAINT "school_city_id_fkey" TO "school_old_province_id_fkey";
