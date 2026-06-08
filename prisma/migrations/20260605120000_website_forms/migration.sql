-- CreateEnum
CREATE TYPE "WebsiteInquiryStatus" AS ENUM ('new', 'read', 'replied', 'closed');

-- CreateEnum
CREATE TYPE "AssistantApplicationStatus" AS ENUM ('new', 'contacted', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "website_contact_inquiries" (
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
CREATE TABLE "assistant_applications" (
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
CREATE INDEX "website_contact_inquiries_status_created_at_idx" ON "website_contact_inquiries"("status", "created_at");

-- CreateIndex
CREATE INDEX "assistant_applications_status_created_at_idx" ON "assistant_applications"("status", "created_at");
