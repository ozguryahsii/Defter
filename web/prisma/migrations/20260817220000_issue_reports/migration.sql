-- "Sorun bildir" geri bildirimleri
CREATE TABLE "IssueReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "IssueReport_userId_createdAt_idx" ON "IssueReport"("userId", "createdAt");
CREATE INDEX "IssueReport_status_createdAt_idx" ON "IssueReport"("status", "createdAt");
