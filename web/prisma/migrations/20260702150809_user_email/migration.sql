-- AlterTable
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "emailVerified" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
