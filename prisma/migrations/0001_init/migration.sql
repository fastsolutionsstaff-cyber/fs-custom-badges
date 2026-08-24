-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('GLOBAL', 'SPECIFIC_PRODUCTS', 'PRODUCT_TAGS', 'COLLECTIONS', 'INVENTORY_LEVEL', 'PRICE_RANGE', 'CUSTOMER_SEGMENT');

-- CreateEnum
CREATE TYPE "BadgeShape" AS ENUM ('PILL', 'SHARP', 'OUTLINE', 'RIBBON', 'FLOATING_GLOW', 'GLASSMORPHISM');

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT', 'CENTER_OVERLAY');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "badgeLimit" INTEGER NOT NULL DEFAULT 10,
    "globalCustomCss" TEXT DEFAULT '',
    "enableAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Conversion Campaign',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL DEFAULT 'BESTSELLER',
    "bgColor" TEXT NOT NULL DEFAULT '#DC2626',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "borderColor" TEXT DEFAULT '#B91C1C',
    "position" "Position" NOT NULL DEFAULT 'TOP_LEFT',
    "shape" "BadgeShape" NOT NULL DEFAULT 'PILL',
    "icon" TEXT DEFAULT '🔥',
    "fontSize" INTEGER NOT NULL DEFAULT 12,
    "fontWeight" TEXT NOT NULL DEFAULT 'bold',
    "paddingY" INTEGER NOT NULL DEFAULT 4,
    "paddingX" INTEGER NOT NULL DEFAULT 10,
    "borderRadius" INTEGER NOT NULL DEFAULT 20,
    "customCss" TEXT DEFAULT '',
    "hideOnMobile" BOOLEAN NOT NULL DEFAULT false,
    "hideOnDesktop" BOOLEAN NOT NULL DEFAULT false,
    "targetType" "TargetType" NOT NULL DEFAULT 'GLOBAL',
    "targetTags" TEXT DEFAULT '',
    "targetCollection" TEXT DEFAULT '',
    "minInventory" INTEGER DEFAULT 0,
    "maxInventory" INTEGER DEFAULT 9999,
    "minPrice" DOUBLE PRECISION DEFAULT 0.00,
    "maxPrice" DOUBLE PRECISION DEFAULT 99999.00,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeProduct" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "BadgeProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsLog" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");

-- CreateIndex
CREATE INDEX "Badge_shop_enabled_priority_idx" ON "Badge"("shop", "enabled", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeProduct_badgeId_productId_key" ON "BadgeProduct"("badgeId", "productId");

-- CreateIndex
CREATE INDEX "AnalyticsLog_badgeId_eventType_idx" ON "AnalyticsLog"("badgeId", "eventType");

-- AddForeignKey
ALTER TABLE "BadgeProduct" ADD CONSTRAINT "BadgeProduct_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsLog" ADD CONSTRAINT "AnalyticsLog_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

