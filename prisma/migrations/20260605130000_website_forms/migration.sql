-- CreateEnum (idempotent — safe if a previous deploy attempt already created these)
DO $$ BEGIN
    CREATE TYPE "WebsiteInquiryStatus" AS ENUM ('new', 'read', 'replied', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AssistantApplicationStatus" AS ENUM ('new', 'contacted', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "website_contact_inquiries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "WebsiteInquiryStatus" NOT NULL DEFAULT 'new',
    "admin_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_contact_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "assistant_applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Patna',
    "message" TEXT,
    "status" "AssistantApplicationStatus" NOT NULL DEFAULT 'new',
    "admin_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "website_contact_inquiries_status_created_at_idx" ON "website_contact_inquiries"("status", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "assistant_applications_status_created_at_idx" ON "assistant_applications"("status", "created_at");
