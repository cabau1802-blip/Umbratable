// backend/src/db.js
const { Pool } = require("pg");

// Se existir DATABASE_URL (produção), usa ela.
// Caso contrário, usa as variáveis DB_* (dev/local).
const hasDatabaseUrl = !!process.env.DATABASE_URL;

const pool = hasDatabaseUrl
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "umbratable_homolog",
      ssl:
        process.env.DB_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });

// Log básico para conferir qual config está sendo usada (sem senha)
console.log("PG config usada:", {
  mode: hasDatabaseUrl ? "DATABASE_URL" : "DB_*",
  host: hasDatabaseUrl ? "(via DATABASE_URL)" : process.env.DB_HOST || "localhost",
  port: hasDatabaseUrl ? "(via DATABASE_URL)" : Number(process.env.DB_PORT || 5432),
  user: hasDatabaseUrl ? "(via DATABASE_URL)" : process.env.DB_USER || "postgres",
  database: hasDatabaseUrl ? "(via DATABASE_URL)" : process.env.DB_NAME || "umbratable_homolog",
  ssl: process.env.DB_SSL === "true",
});

// Em caso de erro inesperado no pool
pool.on("error", (err) => {
  console.error("Erro inesperado no pool de conexões do Postgres:", err);
});

// Exporta como { pool } pra bater com o restante do código
module.exports = { pool };
