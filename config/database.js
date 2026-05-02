const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error(
    "Missing DATABASE_URL. Add a hosted Postgres database and set DATABASE_URL in Vercel."
  );
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

function normalizeQuery(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function query(sql, params = []) {
  const result = await pool.query(normalizeQuery(sql), params);
  const rows = result.rows || [];
  const metadata = {
    rowCount: result.rowCount,
    insertId: rows[0]?.id,
  };

  return [rows, metadata];
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS information (
      id SERIAL PRIMARY KEY,
      home TEXT NOT NULL,
      department TEXT NOT NULL,
      name TEXT NOT NULL,
      designation TEXT NOT NULL,
      information TEXT NOT NULL,
      authorized_by TEXT NOT NULL,
      state_type TEXT NOT NULL,
      send_to JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS counts (
      id SERIAL PRIMARY KEY,
      in_house INTEGER NOT NULL DEFAULT 0,
      new_admissions INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tempstaff (
      id SERIAL PRIMARY KEY,
      info_id INTEGER NOT NULL REFERENCES information(id) ON DELETE CASCADE,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (info_id, staff_id)
    );
  `);
}

let initializationPromise;

async function ready() {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase()
      .then(() => console.log("Database initialized successfully."))
      .catch((error) => {
        initializationPromise = undefined;
        console.error("Database initialization error:", error);
        throw error;
      });
  }

  return initializationPromise;
}

module.exports = {
  query,
  ready,
};
