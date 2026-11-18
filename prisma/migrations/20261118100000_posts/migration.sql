-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'news',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "lang" TEXT NOT NULL DEFAULT 'it',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "event_start" TIMESTAMP(3),
    "event_end" TIMESTAMP(3),
    "location" TEXT,
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_mails" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimed_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_mails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");
CREATE INDEX "posts_published_published_at_idx" ON "posts"("published", "published_at");
CREATE UNIQUE INDEX "post_mails_post_id_user_id_key" ON "post_mails"("post_id", "user_id");
CREATE INDEX "post_mails_status_id_idx" ON "post_mails"("status", "id");

-- AddForeignKey
ALTER TABLE "post_mails" ADD CONSTRAINT "post_mails_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
