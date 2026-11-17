-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" TEXT,
ADD COLUMN "institute" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'it',
ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "reset_hash" TEXT,
ADD COLUMN "reset_expires" TIMESTAMP(3),
ADD COLUMN "reset_sent_at" TIMESTAMP(3),
ADD COLUMN "new_email" TEXT,
ADD COLUMN "new_email_hash" TEXT,
ADD COLUMN "new_email_expires" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_reset_hash_key" ON "users"("reset_hash");

-- CreateIndex
CREATE UNIQUE INDEX "users_new_email_hash_key" ON "users"("new_email_hash");
