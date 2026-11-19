-- FTR-COMP-002: an organizer can unlist a competition from Explore. Unlisted competitions leave
-- every Explore list (signed-in and the signed-out landing) but keep their detail reachable by
-- direct link. Existing competitions stay listed.

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS explore_listing TEXT NOT NULL DEFAULT 'listed'
    CONSTRAINT competitions_explore_listing_check CHECK (explore_listing IN ('listed', 'unlisted'));
