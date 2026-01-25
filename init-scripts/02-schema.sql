DROP TABLE IF EXISTS experiment_versions CASCADE;
DROP TABLE IF EXISTS experiments CASCADE;

CREATE TABLE experiments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL,
    current_version_id INTEGER NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE experiment_versions (
    id SERIAL PRIMARY KEY,
    experiment_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL,
    html_content TEXT NULL,
    created_by UUID NOT NULL,
    commit_message VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_experiment_versions_experiment_id 
        FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
    
    CONSTRAINT uk_experiment_version_number 
        UNIQUE (experiment_id, version_number)
);

ALTER TABLE experiments ADD CONSTRAINT fk_experiments_current_version 
    FOREIGN KEY (current_version_id) REFERENCES experiment_versions(id);

CREATE INDEX idx_experiments_created_by ON experiments(created_by);
CREATE INDEX idx_experiments_title ON experiments(title);
CREATE INDEX idx_experiment_versions_experiment_id ON experiment_versions(experiment_id);
CREATE INDEX idx_experiment_versions_created_at ON experiment_versions(created_at);
