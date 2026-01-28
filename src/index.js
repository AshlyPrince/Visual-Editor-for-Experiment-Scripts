const express = require('express');
const cors = require('cors');
const { pool, dbPing } = require('./config/db.js');
const config = require('./config/config');
const { protect, optionalAuth, getUserInfo } = require('./middleware/auth');

const experimentService = require('./services/experimentService');
const llmService = require('./services/llmService');

const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:5173",
    "http://localhost:5177",
    "https://visual-editor-frontend.onrender.com"
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/db/ping", async (_req, res) => {
  try {
    const dbStatus = await dbPing();
    res.json({ db: dbStatus ? "up" : "down" });
  } catch (e) {
    res.status(500).json({ db: "down" });
  }
});

app.get("/auth/check", optionalAuth, (req, res) => {
  const userInfo = getUserInfo(req);
  res.json({
    authenticated: !!userInfo,
    protection_enabled: config.protection.enabled,
    user: userInfo
  });
});

app.get("/auth/user", protect, (req, res) => {
  const userInfo = getUserInfo(req);
  if (!userInfo) return res.status(401).json({ error: "Not authenticated" });
  res.json(userInfo);
});

async function initializeDatabase() {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('experiments', 'experiment_versions')
    `);
    
    if (parseInt(result.rows[0].count) < 2) {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
      await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
      
      await pool.query(`
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
      `);
    }
  } catch (error) {
    console.error('DB init failed:', error.message);
  }
}

initializeDatabase();
app.post("/api/experiments", protect, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    if (!userInfo?.id) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const experiment = await experimentService.createExperiment(req.body, userInfo.id);
    res.status(201).json(experiment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/experiments", protect, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    const { page, limit, search, category, visibility } = req.query;
    const options = { 
      page: parseInt(page) || 1, 
      limit: parseInt(limit) || 20, 
      search, 
      category, 
      visibility 
    };
    
    const experiments = await experimentService.getUserExperiments(userInfo.id, options);
    res.json(experiments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/experiments/:id", protect, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    const experiment = await experimentService.getExperiment(req.params.id, userInfo.id);
    res.json(experiment);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.put("/api/experiments/:id", protect, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    const experiment = await experimentService.updateExperiment(req.params.id, req.body, userInfo.id);
    res.json(experiment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/experiments/:id", protect, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    await experimentService.deleteExperiment(req.params.id, userInfo.id);
    res.json({ message: "Experiment deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/experiments/:id/versions", protect, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    const version = await experimentService.createVersion(req.params.id, req.body, userInfo.id);
    res.status(201).json(version);
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json(error.details);
    }
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/experiments/:id/versions", protect, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    const versions = await experimentService.getVersionHistory(req.params.id, userInfo.id);
    res.json(versions);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/experiments/:id/versions/:versionId/checkout", protect, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    const version = await experimentService.checkoutVersion(req.params.id, req.params.versionId, userInfo.id);
    res.json(version);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/experiments/:id/view", async (req, res) => {
  try {
    const { version_id } = req.query;
    
    const experiment = await pool.query(
      `SELECT e.*, ev.content, ev.html_content, ev.version_number, ev.title as version_title
       FROM experiments e
       JOIN experiment_versions ev ON (ev.id = $2 OR (e.current_version_id = ev.id AND $2 IS NULL))
       WHERE e.id = $1 AND e.is_deleted = false`,
      [req.params.id, version_id]
    );

    if (experiment.rows.length === 0) {
      return res.status(404).json({ error: "Experiment not found" });
    }

    res.json(experiment.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/llm/chat', protect, async (req, res) => {
  try {
    const { model, messages, temperature, max_tokens } = req.body;
    const result = await llmService.callLLMWithModel({ model, messages, temperature, max_tokens });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = config.port || 3001;
app.listen(PORT, () => {});

