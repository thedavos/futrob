-- Better Auth 1.7.3+ removes the `issuer` requirement on `account`
-- (see https://www.better-auth.com/docs/guides/1-7-upgrade-guide).
-- 1.7.0 through 1.7.2 added `issuer NOT NULL` + a compound unique index;
-- newer versions never write `issuer`, so inserts fail until it is relaxed.
-- SQLite has no ALTER COLUMN, so drop the column instead.
DROP INDEX IF EXISTS `account_issuer_accountId_uidx`;
ALTER TABLE `account` DROP COLUMN `issuer`;
