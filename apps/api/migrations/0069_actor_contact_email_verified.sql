-- AUTH-02: whether the actor's credential email is verified, projected by apps/auth (the only
-- writer) next to the email it describes, so the product can tell a verified contact without
-- reading auth tables. Like 0056, this backfill is the one read of auth_users: existing accounts
-- keep the verification state Better Auth already holds and can verify from the app banner.

ALTER TABLE actor_contact_profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE actor_contact_profiles AS profiles
SET email_verified = auth_users.email_verified
FROM identity_subjects
INNER JOIN auth_users ON auth_users.id = identity_subjects.subject
WHERE identity_subjects.provider = 'credential'
  AND identity_subjects.actor_id = profiles.actor_id
  AND auth_users.email = profiles.email
  AND auth_users.email_verified;
