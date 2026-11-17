-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3),
ADD COLUMN "verify_hash" TEXT,
ADD COLUMN "verify_expires" TIMESTAMP(3),
ADD COLUMN "verify_sent_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_verify_hash_key" ON "users"("verify_hash");
