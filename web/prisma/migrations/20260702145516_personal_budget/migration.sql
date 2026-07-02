-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL DEFAULT 'expense',
    "splitType" TEXT NOT NULL DEFAULT 'Equal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "receiptPath" TEXT,
    "originalAmount" REAL,
    "originalCurrency" TEXT,
    "fxRate" REAL,
    "recurringId" TEXT,
    CONSTRAINT "Expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Expense_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("amount", "category", "createdAt", "date", "description", "fxRate", "groupId", "id", "originalAmount", "originalCurrency", "payerId", "receiptPath", "recurringId", "splitType", "updatedAt") SELECT "amount", "category", "createdAt", "date", "description", "fxRate", "groupId", "id", "originalAmount", "originalCurrency", "payerId", "receiptPath", "recurringId", "splitType", "updatedAt" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Data migration: retire the "Girisim" group type (converted to "Tatil")
UPDATE "Group" SET "type" = 'Tatil' WHERE "type" = 'Girisim';
