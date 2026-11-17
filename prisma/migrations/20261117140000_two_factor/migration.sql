-- AlterTable
ALTER TABLE "users" ADD COLUMN "totp_secret" TEXT,
ADD COLUMN "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totp_recovery" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "totp_last_step" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totp_fails" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "totp_lock_until" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);
