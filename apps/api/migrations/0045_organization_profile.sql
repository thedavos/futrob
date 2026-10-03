-- Organization profile (ADR-0022): slug, time zone and logo.
-- Columns arrive nullable, existing rows are backfilled, then the constraints are enforced.
-- Logo uploads are R2 keys under organization-logos/{organization_id}/; `monogram` has no key.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS slug TEXT NULL,
  ADD COLUMN IF NOT EXISTS time_zone TEXT NULL,
  ADD COLUMN IF NOT EXISTS logo_kind TEXT NOT NULL DEFAULT 'monogram',
  ADD COLUMN IF NOT EXISTS logo_value TEXT NULL;

-- Slug: the name without diacritics, lowercase, words joined by `-` (at most 48 characters,
-- at least 3, otherwise `org`). A reserved or taken base gets `-2`, `-3`… in creation order.
-- The reserved words mirror RESERVED_ORGANIZATION_SLUGS at the time of this migration.
DO $$
DECLARE
  organization RECORD;
  base TEXT;
  candidate TEXT;
  suffix TEXT;
  attempt INTEGER;
  reserved TEXT[] := ARRAY[
    'admin', 'api', 'app', 'auth', 'explore', 'futrob', 'invitations', 'login', 'logout',
    'media', 'new', 'onboarding', 'orgs', 'player', 'settings', 'signup', 'support'
  ];
BEGIN
  FOR organization IN
    SELECT id, name FROM organizations WHERE slug IS NULL ORDER BY created_at, id
  LOOP
    base := LOWER(REGEXP_REPLACE(NORMALIZE(organization.name, NFKD), '[̀-ͯ]', '', 'g'));
    base := REGEXP_REPLACE(base, '[^a-z0-9]+', '-', 'g');
    base := REGEXP_REPLACE(LEFT(BTRIM(base, '-'), 48), '-+$', '');
    IF CHAR_LENGTH(base) < 3 THEN
      base := 'org';
    END IF;

    attempt := 1;
    LOOP
      suffix := CASE WHEN attempt = 1 THEN '' ELSE '-' || attempt::TEXT END;
      candidate := REGEXP_REPLACE(LEFT(base, 48 - CHAR_LENGTH(suffix)), '-+$', '') || suffix;
      EXIT WHEN CHAR_LENGTH(candidate) >= 3
        AND NOT (candidate = ANY (reserved))
        AND NOT EXISTS (SELECT 1 FROM organizations WHERE slug = candidate);
      attempt := attempt + 1;
    END LOOP;

    UPDATE organizations SET slug = candidate WHERE id = organization.id;
  END LOOP;
END
$$;

-- Time zone: the oldest competition's zone, or UTC for an organization without competitions.
UPDATE organizations AS organization
SET time_zone = COALESCE(
  (
    SELECT competition.time_zone
    FROM competitions AS competition
    WHERE competition.organization_id = organization.id
    ORDER BY competition.created_at ASC, competition.id ASC
    LIMIT 1
  ),
  'UTC'
)
WHERE organization.time_zone IS NULL;

ALTER TABLE organizations
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN time_zone SET NOT NULL;

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_slug_format_check;
ALTER TABLE organizations
  ADD CONSTRAINT organizations_slug_format_check
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(slug) BETWEEN 3 AND 48);

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_logo_check;
ALTER TABLE organizations
  ADD CONSTRAINT organizations_logo_check
  CHECK (
    (logo_kind = 'monogram' AND logo_value IS NULL)
    OR (logo_kind = 'upload' AND logo_value IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_unique ON organizations (slug);
