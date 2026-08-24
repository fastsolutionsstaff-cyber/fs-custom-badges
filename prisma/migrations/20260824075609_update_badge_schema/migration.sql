/*
  Warnings:

  - Added the required column `shop` to the `AnalyticsLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AnalyticsLog" ADD COLUMN     "shop" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "BadgeCollection" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,

    CONSTRAINT "BadgeCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BadgeCollection_collectionId_idx" ON "BadgeCollection"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeCollection_badgeId_collectionId_key" ON "BadgeCollection"("badgeId", "collectionId");

-- CreateIndex
CREATE INDEX "AnalyticsLog_shop_timestamp_idx" ON "AnalyticsLog"("shop", "timestamp");

-- CreateIndex
CREATE INDEX "Badge_startDate_endDate_idx" ON "Badge"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "BadgeProduct_productId_idx" ON "BadgeProduct"("productId");

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");

-- AddForeignKey
ALTER TABLE "BadgeCollection" ADD CONSTRAINT "BadgeCollection_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
