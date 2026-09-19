import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(path.join(dataDir, 'catalog.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS coins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mint TEXT NOT NULL UNIQUE,
    name TEXT,
    symbol TEXT,
    description TEXT,
    image_uri TEXT,
    twitter TEXT,
    website TEXT,
    telegram TEXT,
    metadata_uri TEXT,
    creator TEXT,
    tweet_text TEXT NOT NULL DEFAULT '',
    thoughts TEXT NOT NULL DEFAULT '',
    usd_market_cap REAL,
    peak_market_cap REAL,
    is_live INTEGER NOT NULL DEFAULT 0,
    created_timestamp INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

function columnExists(table, name) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  return cols.some((c) => c.name === name)
}

function migrate() {
  if (columnExists('coins', 'note') && !columnExists('coins', 'thoughts')) {
    db.exec(`ALTER TABLE coins ADD COLUMN thoughts TEXT NOT NULL DEFAULT ''`)
    db.exec(`UPDATE coins SET thoughts = note WHERE note != ''`)
  }
  if (!columnExists('coins', 'tweet_text')) {
    db.exec(`ALTER TABLE coins ADD COLUMN tweet_text TEXT NOT NULL DEFAULT ''`)
  }
  if (!columnExists('coins', 'thoughts')) {
    db.exec(`ALTER TABLE coins ADD COLUMN thoughts TEXT NOT NULL DEFAULT ''`)
  }
  if (!columnExists('coins', 'usd_market_cap')) {
    db.exec(`ALTER TABLE coins ADD COLUMN usd_market_cap REAL`)
  }
  if (!columnExists('coins', 'peak_market_cap')) {
    db.exec(`ALTER TABLE coins ADD COLUMN peak_market_cap REAL`)
  }
  if (!columnExists('coins', 'is_live')) {
    db.exec(`ALTER TABLE coins ADD COLUMN is_live INTEGER NOT NULL DEFAULT 0`)
  }
  if (!columnExists('coins', 'created_timestamp')) {
    db.exec(`ALTER TABLE coins ADD COLUMN created_timestamp INTEGER`)
  }
}

migrate()

export default db
