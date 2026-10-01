-- AlterTable
ALTER TABLE "user_group" ADD COLUMN     "created_by_id" INTEGER;

-- AddForeignKey
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
