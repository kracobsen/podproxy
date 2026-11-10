const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'podproxy.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    upstream_url TEXT NOT NULL,
    custom_title TEXT,
    custom_image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function newToken() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = {
  listFeeds() {
    return db.prepare('SELECT * FROM feeds ORDER BY id DESC').all();
  },
  getFeedById(id) {
    return db.prepare('SELECT * FROM feeds WHERE id = ?').get(id);
  },
  getFeedByToken(token) {
    return db.prepare('SELECT * FROM feeds WHERE token = ?').get(token);
  },
  // `token` is optional: pass one to keep an existing secret URL.
  createFeed({ name, upstreamUrl, customTitle, customImageUrl, token }) {
    token = token || newToken();
    db.prepare(
      'INSERT INTO feeds (token, name, upstream_url, custom_title, custom_image_url) VALUES (?, ?, ?, ?, ?)'
    ).run(token, name, upstreamUrl, customTitle || null, customImageUrl || null);
    return this.getFeedByToken(token);
  },
  updateFeed(id, { name, upstreamUrl, customTitle, customImageUrl }) {
    db.prepare(
      'UPDATE feeds SET name = ?, upstream_url = ?, custom_title = ?, custom_image_url = ? WHERE id = ?'
    ).run(name, upstreamUrl, customTitle || null, customImageUrl || null, id);
  },
  regenerateToken(id) {
    const token = newToken();
    db.prepare('UPDATE feeds SET token = ? WHERE id = ?').run(token, id);
    return token;
  },
  setToken(id, token) {
    db.prepare('UPDATE feeds SET token = ? WHERE id = ?').run(token, id);
  },
  deleteFeed(id) {
    db.prepare('DELETE FROM feeds WHERE id = ?').run(id);
  },
};
