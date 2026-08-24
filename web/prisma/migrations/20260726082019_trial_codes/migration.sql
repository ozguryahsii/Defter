-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DiscountCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'discount',
    "percent" INTEGER NOT NULL,
    "trialDays" INTEGER,
    "maxUses" INTEGER,
    "influencer" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DiscountCode" ("active", "code", "createdAt", "expiresAt", "id", "influencer", "percent") SELECT "active", "code", "createdAt", "expiresAt", "id", "influencer", "percent" FROM "DiscountCode";
DROP TABLE "DiscountCode";
ALTER TABLE "new_DiscountCode" RENAME TO "DiscountCode";
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

