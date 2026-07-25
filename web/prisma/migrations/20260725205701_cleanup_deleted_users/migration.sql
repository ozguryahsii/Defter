-- Daha önce hesabını silen kullanıcıların geride kalan kişisel verilerini
-- temizle (e-posta serbest kalsın, aynı adresle yeniden kayıt olunabilsin).
UPDATE "User"
SET "email" = NULL,
    "emailVerified" = NULL,
    "iban" = NULL,
    "ibanName" = NULL,
    "avatarPath" = NULL,
    "premium" = false,
    "premiumPlan" = NULL,
    "premiumSource" = NULL,
    "premiumUntil" = NULL
WHERE "username" LIKE 'silinen_%';
