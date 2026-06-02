-- Payment settlement flow: post-completion pay + cash via assistant wallet

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_confirm_otp" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_otp_expires_at" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "assistant_earning_amount" DOUBLE PRECISION;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "company_share_amount" DOUBLE PRECISION;

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "cash_collected_at" TIMESTAMP(3);
ALTER TABLE "payments" ALTER COLUMN "method" DROP NOT NULL;

ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "min_assistant_settlement_balance" DOUBLE PRECISION NOT NULL DEFAULT 150;
