-- AlterTable
ALTER TABLE "users" ADD COLUMN "delete_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_delete_at_idx" ON "users"("delete_at");
