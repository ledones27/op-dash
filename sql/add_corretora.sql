-- Add corretora text column to trades (replaces old quantfury boolean)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS corretora text DEFAULT null;

-- Migrate existing quantfury=true rows to corretora='Quantfury'
UPDATE trades SET corretora = 'Quantfury' WHERE quantfury = true AND (corretora IS NULL OR corretora = '');

-- Add corretora text column to watchlist
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS corretora text DEFAULT null;

-- Optionally drop the old boolean column after verifying migration:
-- ALTER TABLE trades DROP COLUMN IF EXISTS quantfury;
