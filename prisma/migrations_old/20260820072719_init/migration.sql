/*
  Warnings:

  - You are about to drop the column `refreshToken` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `refreshTokenExpires` on the `Session` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "badgeIndex" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "text" TEXT NOT NULL DEFAULT 'NEW',
    "bgColor" TEXT NOT NULL DEFAULT '#111827',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "position" TEXT NOT NULL DEFAULT 'top-left',
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BadgeProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "badgeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "BadgeProduct_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);
INSERT INTO "new_Session" ("accessToken", "accountOwner", "collaborator", "email", "emailVerified", "expires", "firstName", "id", "isOnline", "lastName", "locale", "scope", "shop", "state", "userId") SELECT "accessToken", "accountOwner", "collaborator", "email", "emailVerified", "expires", "firstName", "id", "isOnline", "lastName", "locale", "scope", "shop", "state", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Badge_shop_badgeIndex_key" ON "Badge"("shop", "badgeIndex");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeProduct_badgeId_productId_key" ON "BadgeProduct"("badgeId", "productId");
