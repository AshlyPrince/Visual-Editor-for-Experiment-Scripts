ALTER TABLE experiments 
ADD COLUMN IF NOT EXISTS current_version_number INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS updated_by UUID NULL;

UPDATE experiments e
SET current_version_number = COALESCE(
    (SELECT version_number 
     FROM experiment_versions ev 
     WHERE ev.id = e.current_version_id),
    1
)
WHERE current_version_number = 1;

UPDATE experiments
SET updated_by = created_by
WHERE updated_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_experiments_current_version_number 
ON experiments(current_version_number);
