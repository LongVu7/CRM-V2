/*
  Warnings:

  - A unique constraint covering the columns `[name,city_id]` on the table `school` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "school_name_city_id_key" ON "school"("name", "city_id");
