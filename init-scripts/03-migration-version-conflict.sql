-- Migration: Add version conflict checking support
-- Run this on existing databases

-- Add new columns to experiments table
ALTER TABLE experiments 
ADD COLUMN IF NOT EXISTS current_version_number INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

-- Update current_version_number for existing experiments
UPDATE experiments e
SET current_version_number = COALESCE(
    (SELECT version_number 
     FROM experiment_versions ev 
     WHERE ev.id = e.current_version_id),
    1
)
WHERE current_version_number = 1;

-- Set updated_by to created_by for existing experiments
UPDATE experiments
SET updated_by = created_by
WHERE updated_by IS NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_experiments_current_version_number 
ON experiments(current_version_number);

COMMENT ON COLUMN experiments.current_version_number IS 'Tracks current version for conflict detection';
COMMENT ON COLUMN experiments.updated_by IS 'User who last updated the experiment';
