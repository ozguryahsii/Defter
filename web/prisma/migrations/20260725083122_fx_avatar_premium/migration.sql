-- CreateTable
CREATE TABLE "FxCache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rates" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "emailVerified" DATETIME,
    "iban" TEXT,
    "ibanName" TEXT,
    "avatarPath" TEXT,
    "premium" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("createdAt", "displayName", "email", "emailVerified", "iban", "ibanName", "id", "passwordHash", "username") SELECT "createdAt", "displayName", "email", "emailVerified", "iban", "ibanName", "id", "passwordHash", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

