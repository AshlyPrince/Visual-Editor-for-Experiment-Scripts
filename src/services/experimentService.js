const { pool } = require('../config/db');

class ExperimentService {
  async createExperiment(data, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const experimentResult = await client.query(
        `INSERT INTO experiments (title, created_by, current_version_number, updated_by) 
         VALUES ($1, $2, 1, $3) RETURNING *`,
        [data.title, userId, userId]
      );
      const experiment = experimentResult.rows[0];

      const versionResult = await client.query(
        `INSERT INTO experiment_versions (experiment_id, version_number, title, content, html_content, created_by, commit_message)
         VALUES ($1, 1, $2, $3, $4, $5, $6) RETURNING *`,
        [experiment.id, data.title, data.content || {}, data.html_content || null, userId, data.commit_message || 'Initial version']
      );
      const version = versionResult.rows[0];

      await client.query(
        `UPDATE experiments SET current_version_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [version.id, experiment.id]
      );

      await client.query('COMMIT');

      return {
        ...experiment,
        current_version_id: version.id,
        version_number: version.version_number,
        content: version.content,
        html_content: version.html_content
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserExperiments(userId, options = {}) {
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.id, e.title, e.created_by, e.current_version_id, e.created_at, e.updated_at,
             ev.version_number, ev.content, ev.title as version_title
      FROM experiments e
      LEFT JOIN experiment_versions ev ON e.current_version_id = ev.id
      WHERE e.is_deleted = false
    `;

    const params = [];
    if (search) {
      query += ` AND e.title ILIKE $${params.length + 1}`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY e.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getExperiment(experimentId, userId) {
    const result = await pool.query(
      `SELECT e.id, e.title, e.created_by, e.current_version_id, e.current_version_number, 
              e.updated_by, e.created_at, e.updated_at,
              ev.version_number, ev.title as version_title, ev.content, ev.html_content, ev.commit_message
       FROM experiments e
       LEFT JOIN experiment_versions ev ON e.current_version_id = ev.id
       WHERE e.id = $1 AND e.is_deleted = false`,
      [experimentId]
    );

    if (!result.rows[0]) throw new Error('Experiment not found');
    return result.rows[0];
  }

  async createVersion(experimentId, data, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the experiment row and get current version
      const experiment = await client.query(
        `SELECT id, title, current_version_number, updated_by, updated_at 
         FROM experiments 
         WHERE id = $1 AND is_deleted = false 
         FOR UPDATE`,
        [experimentId]
      );
      
      if (!experiment.rows[0]) {
        throw new Error('Experiment not found');
      }

      const currentExperiment = experiment.rows[0];
      const baseVersion = data.base_version;

      // Check for version conflict
      if (baseVersion !== undefined && baseVersion !== null && 
          baseVersion !== currentExperiment.current_version_number) {
        const error = new Error('VERSION_CONFLICT');
        error.statusCode = 409;
        error.details = {
          error: 'VERSION_CONFLICT',
          message: 'The experiment has been updated by another user',
          current_version: currentExperiment.current_version_number,
          your_version: baseVersion,
          updated_by: currentExperiment.updated_by,
          updated_at: currentExperiment.updated_at
        };
        throw error;
      }

      // Calculate next version number
      const versionNumber = currentExperiment.current_version_number + 1;

      // Create new version
      const newVersion = await client.query(
        `INSERT INTO experiment_versions (experiment_id, version_number, title, content, html_content, commit_message, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [experimentId, versionNumber, data.title || currentExperiment.title, data.content, 
         data.html_content || null, data.commit_message || `Version ${versionNumber}`, userId]
      );

      // Update experiment with new version
      await client.query(
        `UPDATE experiments 
         SET current_version_id = $1, 
             current_version_number = $2, 
             updated_by = $3,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4`,
        [newVersion.rows[0].id, versionNumber, userId, experimentId]
      );

      await client.query('COMMIT');
      return newVersion.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getVersionHistory(experimentId, userId) {
    const experiment = await pool.query(
      `SELECT id FROM experiments WHERE id = $1 AND is_deleted = false`,
      [experimentId]
    );
    if (!experiment.rows[0]) throw new Error('Experiment not found');

    const result = await pool.query(
      `SELECT * FROM experiment_versions WHERE experiment_id = $1 ORDER BY version_number DESC`,
      [experimentId]
    );
    return result.rows;
  }

  async checkoutVersion(experimentId, versionId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const experiment = await client.query(
        `SELECT id FROM experiments WHERE id = $1 AND is_deleted = false`,
        [experimentId]
      );
      if (!experiment.rows[0]) throw new Error('Experiment not found');

      const version = await client.query(
        `SELECT * FROM experiment_versions WHERE id = $1 AND experiment_id = $2`,
        [versionId, experimentId]
      );
      if (!version.rows[0]) throw new Error('Version not found');

      await client.query(
        `UPDATE experiments SET current_version_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [versionId, experimentId]
      );

      await client.query('COMMIT');
      return version.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateExperiment(experimentId, data, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const experiment = await client.query(
        `SELECT id FROM experiments WHERE id = $1 AND is_deleted = false`,
        [experimentId]
      );
      if (!experiment.rows[0]) throw new Error('Experiment not found');

      const result = await client.query(
        `UPDATE experiments SET title = COALESCE($1, title), updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [data.title, experimentId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteExperiment(experimentId, userId) {
    const result = await pool.query(
      `UPDATE experiments SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND is_deleted = false RETURNING id`,
      [experimentId]
    );

    if (!result.rows[0]) throw new Error('Experiment not found');
    return { message: 'Experiment deleted successfully' };
  }
}

module.exports = new ExperimentService();
