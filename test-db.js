require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const db = require("./config/database");

async function testConnection() {
  try {
    await db.ready();
    const [rows] = await db.query("SELECT 1 AS ok");
    console.log("Database connected successfully.", rows[0]);
  } catch (error) {
    console.error("Connection error:", error.message);
    process.exitCode = 1;
  }
}

testConnection();
