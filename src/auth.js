const crypto = require('node:crypto');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('ADMIN_PASSWORD environment variable must be set.');
  process.exit(1);
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = 'pp_session';

// Stable per-password secret so sessions survive restarts. SESSION_SECRET can
// override it to keep sessions valid across password changes.
const secret =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`podproxy:${ADMIN_PASSWORD}`).digest('hex');

function sign(value) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function makeSessionCookie() {
  const expires = Date.now() + SESSION_TTL_MS;
  return `${expires}.${sign(String(expires))}`;
}

function isValidSession(cookieValue) {
  if (!cookieValue) return false;
  const [expires, mac] = cookieValue.split('.');
  if (!expires || !mac) return false;
  if (Date.now() > Number(expires)) return false;
  const expected = sign(expires);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function checkPassword(password) {
  const a = crypto.createHash('sha256').update(String(password || '')).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

// Basic brute-force protection: 10 failed attempts per IP per 15 minutes.
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function loginAllowed(ip) {
  const entry = attempts.get(ip);
  if (!entry || Date.now() - entry.start > WINDOW_MS) return true;
  return entry.count < MAX_ATTEMPTS;
}

function recordFailedLogin(ip) {
  const entry = attempts.get(ip);
  if (!entry || Date.now() - entry.start > WINDOW_MS) {
    attempts.set(ip, { start: Date.now(), count: 1 });
  } else {
    entry.count += 1;
  }
}

function parseCookies(header) {
  const out = {};
  for (const part of (header || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

module.exports = {
  COOKIE_NAME,
  makeSessionCookie,
  isValidSession,
  checkPassword,
  loginAllowed,
  recordFailedLogin,
  parseCookies,
};
