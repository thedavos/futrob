ALTER TABLE competitions
  DROP CONSTRAINT IF EXISTS competitions_region_check;

ALTER TABLE competitions
  ADD CONSTRAINT competitions_region_check CHECK (
    region IN (
      'america', 'south-america', 'north-central-america', 'europe', 'africa',
      'asia', 'middle-east', 'oceania'
    )
  );
