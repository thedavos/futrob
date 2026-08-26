-- Better Auth 1.7 keys accounts by (issuer, accountId). Email/password uses
-- the synthetic issuer `local:credential` (createLocalAccountIssuer).
ALTER TABLE `account` ADD COLUMN `issuer` text NOT NULL DEFAULT 'local:credential';

CREATE UNIQUE INDEX `account_issuer_accountId_uidx` ON `account` (`issuer`, `accountId`);
