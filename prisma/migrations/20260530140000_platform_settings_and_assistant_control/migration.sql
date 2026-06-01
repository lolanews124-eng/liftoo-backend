-- Platform settings singleton
CREATE TABLE IF NOT EXISTS "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "match_radius_km" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "signup_wallet_bonus" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "referral_reward_amount" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "assistant_earning_percent" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "match_batch_size" INTEGER NOT NULL DEFAULT 3,
    "platform_fee_percent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "booking_search_timeout_min" INTEGER NOT NULL DEFAULT 15,
    "assistant_code_year" INTEGER NOT NULL DEFAULT 2026,
    "assistant_code_seq" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- Assistant profile extensions
ALTER TABLE "assistant_profiles" ADD COLUMN IF NOT EXISTS "assistant_code" TEXT;
ALTER TABLE "assistant_profiles" ADD COLUMN IF NOT EXISTS "admin_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "assistant_profiles" ADD COLUMN IF NOT EXISTS "admin_verified_at" TIMESTAMP(3);
ALTER TABLE "assistant_profiles" ADD COLUMN IF NOT EXISTS "admin_verified_by" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "assistant_profiles_assistant_code_key" ON "assistant_profiles"("assistant_code");

-- Booking batch dispatch
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dispatch_round" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "notified_assistant_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "offered_assistant_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Rejection reason required
ALTER TABLE "booking_rejections" ALTER COLUMN "reason" SET NOT NULL;
