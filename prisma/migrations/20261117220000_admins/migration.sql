-- CreateTable
CREATE TABLE "admins" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),
    "email_verified_at" TIMESTAMP(3),
    "verify_hash" TEXT,
    "verify_expires" TIMESTAMP(3),
    "verify_sent_at" TIMESTAMP(3),
    "reset_hash" TEXT,
    "reset_expires" TIMESTAMP(3),
    "reset_sent_at" TIMESTAMP(3),
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_recovery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totp_last_step" INTEGER NOT NULL DEFAULT 0,
    "totp_fails" INTEGER NOT NULL DEFAULT 0,
    "totp_lock_until" TIMESTAMP(3),

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_verify_hash_key" ON "admins"("verify_hash");

-- CreateIndex
CREATE UNIQUE INDEX "admins_reset_hash_key" ON "admins"("reset_hash");
