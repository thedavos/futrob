-- Better Auth core tables (email/password) + Futrob Actor mapping.
-- Column names match Better Auth defaults (camelCase fieldName).

CREATE TABLE `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL UNIQUE,
  `emailVerified` integer NOT NULL DEFAULT 0,
  `image` text,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);

CREATE TABLE `session` (
  `id` text PRIMARY KEY NOT NULL,
  `expiresAt` integer NOT NULL,
  `token` text NOT NULL UNIQUE,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  `ipAddress` text,
  `userAgent` text,
  `userId` text NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE
);

CREATE INDEX `session_userId_idx` ON `session` (`userId`);

CREATE TABLE `account` (
  `id` text PRIMARY KEY NOT NULL,
  `accountId` text NOT NULL,
  `providerId` text NOT NULL,
  `userId` text NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE,
  `accessToken` text,
  `refreshToken` text,
  `idToken` text,
  `accessTokenExpiresAt` integer,
  `refreshTokenExpiresAt` integer,
  `scope` text,
  `password` text,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);

CREATE INDEX `account_userId_idx` ON `account` (`userId`);

CREATE TABLE `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expiresAt` integer NOT NULL,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL
);

CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);

-- Futrob identity (ADR-0003): aggregates use ActorId, not Better Auth user.id
CREATE TABLE `actors` (
  `id` text PRIMARY KEY NOT NULL,
  `created_at` integer NOT NULL
);

CREATE TABLE `identity_subjects` (
  `provider` text NOT NULL,
  `subject` text NOT NULL,
  `actor_id` text NOT NULL REFERENCES `actors` (`id`) ON DELETE CASCADE,
  `created_at` integer NOT NULL,
  PRIMARY KEY (`provider`, `subject`)
);

CREATE INDEX `identity_subjects_actor_id_idx` ON `identity_subjects` (`actor_id`);
