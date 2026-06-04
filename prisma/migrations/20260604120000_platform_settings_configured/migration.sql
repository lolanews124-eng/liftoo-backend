-- Admin fills platform settings in the panel; empty form until first save.
ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "settings_configured" BOOLEAN NOT NULL DEFAULT false;
