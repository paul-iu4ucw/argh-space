-- AlterTable
ALTER TABLE "users" ADD COLUMN "mail_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mail_consent_at" TIMESTAMP(3);
