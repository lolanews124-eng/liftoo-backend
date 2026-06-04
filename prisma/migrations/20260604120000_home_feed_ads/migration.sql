CREATE TABLE "home_feed_ads" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "image_url" TEXT NOT NULL,
    "button_label" TEXT,
    "button_link" TEXT,
    "button_action" TEXT NOT NULL DEFAULT 'url',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_feed_ads_pkey" PRIMARY KEY ("id")
);
