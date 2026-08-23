CREATE TABLE `rateLimit` (
  `id` text PRIMARY KEY NOT NULL,
  `key` text NOT NULL UNIQUE,
  `count` integer NOT NULL,
  `lastRequest` integer NOT NULL
);
