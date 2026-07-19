const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let dbType = 'sqlite'; // 'postgres' or 'sqlite'
let pgPool = null;
let sqliteDb = null;

// Initialize Database connection
async function initDb() {
  const usePostgres = process.env.DB_HOST && process.env.DB_USER && process.env.DB_DATABASE;

  if (usePostgres) {
    try {
      pgPool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '5432'),
        connectionTimeoutMillis: 5000
      });
      // Test the connection
      await pgPool.query('SELECT NOW()');
      dbType = 'postgres';
      console.log('Successfully connected to PostgreSQL database.');
      return;
    } catch (err) {
      console.warn('Failed to connect to PostgreSQL. Falling back to SQLite. Error:', err.message);
      if (pgPool) {
        pgPool.end();
        pgPool = null;
      }
    }
  }

  // SQLite Fallback
  dbType = 'sqlite';
  const dbPath = path.resolve(__dirname, '..', 'cavani.db');
  console.log(`Using SQLite database at: ${dbPath}`);

  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to open SQLite database:', err.message);
    } else {
      console.log('SQLite database connection established.');
      // Enable foreign keys
      sqliteDb.run('PRAGMA foreign_keys = ON');
    }
  });
}

// Unified query wrapper
function query(text, params = []) {
  if (dbType === 'postgres') {
    return pgPool.query(text, params);
  } else {
    return new Promise((resolve, reject) => {
      // Map PostgreSQL placeholders ($1, $2) to SQLite placeholders (?)
      let sqliteText = text.replace(/\$\d+/g, '?');
      
      // Map PG functions to SQLite equivalents
      sqliteText = sqliteText.replace(/CURRENT_TIMESTAMP/gi, "datetime('now')");
      sqliteText = sqliteText.replace(/NOW\(\)/gi, "datetime('now')");

      // Handle common queries that might use RETURNING clause in SQLite (where it might fail on older engines)
      // SQLite 3.35+ supports RETURNING, but we'll safeguard it.
      const isInsert = sqliteText.trim().toUpperCase().startsWith('INSERT');

      sqliteDb.all(sqliteText, params, function(err, rows) {
        if (err) {
          // If RETURNING failed, fallback to normal query and fetch last insert id
          if (isInsert && err.message.includes('RETURNING')) {
            const queryNoReturning = sqliteText.split(/returning/i)[0];
            sqliteDb.run(queryNoReturning, params, function(runErr) {
              if (runErr) {
                return reject(runErr);
              }
              // Retrieve the inserted row
              const lastId = this.lastID;
              // We infer table name from INSERT INTO <table>
              const tableMatch = queryNoReturning.match(/INSERT\s+INTO\s+(\w+)/i);
              if (tableMatch && tableMatch[1]) {
                sqliteDb.all(`SELECT * FROM ${tableMatch[1]} WHERE id = ?`, [lastId], (selErr, selRows) => {
                  if (selErr) {
                    return resolve({ rows: [{ id: lastId }] }); // Fallback
                  }
                  resolve({ rows: selRows });
                });
              } else {
                resolve({ rows: [{ id: lastId }] });
              }
            });
          } else {
            reject(err);
          }
        } else {
          resolve({ rows: rows || [] });
        }
      });
    });
  }
}

module.exports = {
  initDb,
  query,
  getDbType: () => dbType,
  getSqliteInstance: () => sqliteDb,
  getPgPool: () => pgPool
};
