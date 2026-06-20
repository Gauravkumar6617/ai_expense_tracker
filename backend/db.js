import dotenv from "dotenv";
import pkg from "pg";

const { Pool,types } = pkg;

dotenv.config();

// Return PostgreSQL DATE as a string instead of a JavaScript Date
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("connect", () => {
  console.log("✅ Connected to database");
});

pool.on("error", (err) => {
  console.error("Database Error:", err.message);
  process.exit(1);
});

export default pool;