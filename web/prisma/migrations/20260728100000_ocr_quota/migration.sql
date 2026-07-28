-- AI receipt-scan monthly quota
ALTER TABLE "User" ADD COLUMN "ocrUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "ocrMonth" TEXT;
