import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DROP_ALL = `
DROP TABLE IF EXISTS ai_insight CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS users CASCADE;
`;

const runMigration = async () => {
  const shouldReset = process.argv.includes("--reset");
  const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");

  try {
    if (shouldReset) {
      console.log("Dropping all the tables");
      await pool.query(DROP_ALL);
    }
    console.log(`Running migration ${schemaPath}`);
    const schema = await fs.readFile(schemaPath, "utf-8");

    console.log("doing migration");
    await pool.query(schema);
    console.log("things worked");
  } catch (error) {
    console.log("error occur during migration", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};
runMigration();
