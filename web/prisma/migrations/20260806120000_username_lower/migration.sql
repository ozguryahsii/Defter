-- Unicode-aware lowercase username for case-insensitive login
ALTER TABLE "User" ADD COLUMN "usernameLower" TEXT;

-- ASCII adlar için doğru sonucu verir; Türkçe karakterliler uygulama
-- tarafındaki tembel düzeltmeyle tamamlanır.
UPDATE "User" SET "usernameLower" = LOWER("username");

CREATE UNIQUE INDEX "User_usernameLower_key" ON "User"("usernameLower");
