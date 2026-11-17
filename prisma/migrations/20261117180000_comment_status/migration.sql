-- AlterTable
ALTER TABLE "comments" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';

-- I commenti già presenti prima della moderazione restano visibili
UPDATE "comments" SET "status" = 'approved';

-- CreateIndex
CREATE INDEX "comments_status_idx" ON "comments"("status");
