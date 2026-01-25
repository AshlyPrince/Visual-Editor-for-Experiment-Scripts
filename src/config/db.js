const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  max: 10,
  idleTimeoutMillis: 30_000,
});

async function dbPing() {
  const r = await pool.query("select 1 as ok");
  return r.rows[0]?.ok === 1;
}

module.exports = { pool, dbPing };
