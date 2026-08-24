-- AlterTable
ALTER TABLE "User" ADD COLUMN "premiumPlan" TEXT;
ALTER TABLE "User" ADD COLUMN "premiumSource" TEXT;
ALTER TABLE "User" ADD COLUMN "premiumUntil" DATETIME;

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "influencer" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CodeRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodeRedemption_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "DiscountCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CodeRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");

-- CreateIndex
CREATE INDEX "CodeRedemption_codeId_createdAt_idx" ON "CodeRedemption"("codeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CodeRedemption_codeId_userId_key" ON "CodeRedemption"("codeId", "userId");

