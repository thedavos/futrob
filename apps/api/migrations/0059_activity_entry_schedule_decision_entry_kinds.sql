-- Activity feed (ADR-0008): schedule changes, organizer decisions and competition entries.
-- Only the closed vocabularies widen; the table shape is unchanged. Resources reuse
-- 'encounter' (schedule changes and decisions on them) and 'competition' (entries).
-- Timestamp-style name so it sorts after every numbered migration and does not collide
-- with the next number other branches take.

ALTER TABLE activity_entries DROP CONSTRAINT IF EXISTS activity_entries_kind_check;
ALTER TABLE activity_entries ADD CONSTRAINT activity_entries_kind_check CHECK (
  kind IN (
    'match_dispute', 'selection_confirmation', 'roster_invitation', 'competition_published',
    'entry_invitation', 'schedule_change', 'organizer_decision', 'competition_entry'
  )
);

ALTER TABLE activity_entries DROP CONSTRAINT IF EXISTS activity_entries_source_name_check;
ALTER TABLE activity_entries ADD CONSTRAINT activity_entries_source_name_check CHECK (
  source_name IN (
    'match_dispute', 'proposal', 'roster_invitation', 'competition', 'entry_invitation',
    'schedule_change_proposal', 'schedule_change_escalation', 'organizer_decision',
    'competition_entry'
  )
);

-- No backfill: a competition entry stores no actor, and a row needs the actor who caused
-- the fact. Entries and schedule changes already pending stay out of the feed.
