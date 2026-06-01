-- CreateTable
CREATE TABLE IF NOT EXISTS "booking_rejections" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "assistant_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_rejections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "booking_rejections_booking_id_assistant_id_key" ON "booking_rejections"("booking_id", "assistant_id");

-- AddForeignKey
ALTER TABLE "booking_rejections" DROP CONSTRAINT IF EXISTS "booking_rejections_booking_id_fkey";
ALTER TABLE "booking_rejections" ADD CONSTRAINT "booking_rejections_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_rejections" DROP CONSTRAINT IF EXISTS "booking_rejections_assistant_id_fkey";
ALTER TABLE "booking_rejections" ADD CONSTRAINT "booking_rejections_assistant_id_fkey" FOREIGN KEY ("assistant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
