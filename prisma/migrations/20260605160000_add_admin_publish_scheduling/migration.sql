ALTER TABLE daily_quest_bank
  ADD COLUMN IF NOT EXISTS publish_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_quest_bank_publish_status_check'
  ) THEN
    ALTER TABLE daily_quest_bank
      ADD CONSTRAINT daily_quest_bank_publish_status_check
        CHECK (publish_status IN ('draft', 'scheduled', 'published', 'archived'));
  END IF;
END $$;

UPDATE daily_quest_bank
SET
  publish_status = CASE WHEN is_active THEN 'published' ELSE 'draft' END,
  published_at = CASE WHEN is_active THEN COALESCE(updated_at, created_at, NOW()) ELSE NULL END;

CREATE INDEX IF NOT EXISTS daily_quest_bank_publish_status_publish_at_idx
  ON daily_quest_bank (publish_status, publish_at);

ALTER TABLE hero_messages
  ADD COLUMN IF NOT EXISTS publish_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hero_messages_publish_status_check'
  ) THEN
    ALTER TABLE hero_messages
      ADD CONSTRAINT hero_messages_publish_status_check
        CHECK (publish_status IN ('draft', 'scheduled', 'published', 'archived'));
  END IF;
END $$;

UPDATE hero_messages
SET
  publish_status = CASE WHEN is_active THEN 'published' ELSE 'draft' END,
  published_at = CASE WHEN is_active THEN COALESCE(updated_at, created_at, NOW()) ELSE NULL END,
  publish_at = CASE WHEN active_date IS NOT NULL THEN active_date::TIMESTAMPTZ ELSE NULL END;

CREATE INDEX IF NOT EXISTS hero_messages_publish_status_publish_at_idx
  ON hero_messages (publish_status, publish_at);

ALTER TABLE mini_games
  ADD COLUMN IF NOT EXISTS publish_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mini_games_publish_status_check'
  ) THEN
    ALTER TABLE mini_games
      ADD CONSTRAINT mini_games_publish_status_check
        CHECK (publish_status IN ('draft', 'scheduled', 'published', 'archived'));
  END IF;
END $$;

UPDATE mini_games
SET
  publish_status = CASE WHEN is_active THEN 'published' ELSE 'draft' END,
  published_at = CASE WHEN is_active THEN COALESCE(updated_at, created_at, NOW()) ELSE NULL END,
  publish_at = CASE WHEN active_date IS NOT NULL THEN active_date::TIMESTAMPTZ ELSE NULL END;

CREATE INDEX IF NOT EXISTS mini_games_publish_status_publish_at_idx
  ON mini_games (publish_status, publish_at);

ALTER TABLE rewards
  ADD COLUMN IF NOT EXISTS publish_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rewards_publish_status_check'
  ) THEN
    ALTER TABLE rewards
      ADD CONSTRAINT rewards_publish_status_check
        CHECK (publish_status IN ('draft', 'scheduled', 'published', 'archived'));
  END IF;
END $$;

UPDATE rewards
SET
  publish_status = CASE WHEN is_active THEN 'published' ELSE 'draft' END,
  published_at = CASE WHEN is_active THEN COALESCE(updated_at, created_at, NOW()) ELSE NULL END;

CREATE INDEX IF NOT EXISTS rewards_publish_status_publish_at_idx
  ON rewards (publish_status, publish_at);
