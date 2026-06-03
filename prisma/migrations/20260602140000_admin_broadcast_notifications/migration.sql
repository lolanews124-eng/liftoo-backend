-- Admin broadcast notifications: audience enum, history table, notification type

CREATE TYPE "BroadcastAudience" AS ENUM ('customer', 'assistant');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'admin_broadcast';

CREATE TABLE "admin_broadcasts" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "audience" "BroadcastAudience" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_broadcasts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_broadcasts_created_at_idx" ON "admin_broadcasts"("created_at");
