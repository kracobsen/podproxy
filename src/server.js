const express = require('express');
const db = require('./db');
const { getFeedXml, invalidate } = require('./feed');
const auth = require('./auth');
const { loginPage, dashboardPage } = require('./html');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true); // behind Coolify's reverse proxy
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

function baseUrl(req) {
  return (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}

function setSessionCookie(res, req) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${auth.COOKIE_NAME}=${auth.makeSessionCookie()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${auth.COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
}

function requireAdmin(req, res, next) {
  const cookies = auth.parseCookies(req.headers.cookie);
  if (auth.isValidSession(cookies[auth.COOKIE_NAME])) return next();
  res.status(401).send(loginPage());
}

function validateFeedInput(body) {
  const name = String(body.name || '').trim();
  const upstreamUrl = String(body.upstream_url || '').trim();
  const customTitle = String(body.custom_title || '').trim();
  const customImageUrl = String(body.custom_image_url || '').trim();
  if (!name || name.length > 200) return { error: 'Name is required (max 200 chars).' };
  for (const [label, value, required] of [
    ['Upstream feed URL', upstreamUrl, true],
    ['Custom artwork URL', customImageUrl, false],
  ]) {
    if (!value) {
      if (required) return { error: `${label} is required.` };
      continue;
    }
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      return { error: `${label} is not a valid URL.` };
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { error: `${label} must be http(s).` };
    }
  }
  return { name, upstreamUrl, customTitle, customImageUrl };
}

// ---- Feed proxy (public, protected by the unguessable token) ----

app.get('/f/:token', async (req, res) => {
  const token = req.params.token.replace(/\.xml$/i, '');
  if (!/^[0-9a-f]{32}$/.test(token)) return res.status(404).send('Not found');
  const feed = db.getFeedByToken(token);
  if (!feed) return res.status(404).send('Not found');
  try {
    const { body, contentType } = await getFeedXml(feed);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(body);
  } catch (err) {
    console.error(`feed ${feed.id} (${feed.upstream_url}):`, err.message);
    res.status(502).send('Failed to fetch upstream feed');
  }
});

// ---- Admin UI ----

app.get('/', (req, res) => res.redirect('/admin'));

app.get('/admin', (req, res) => {
  const cookies = auth.parseCookies(req.headers.cookie);
  if (!auth.isValidSession(cookies[auth.COOKIE_NAME])) return res.send(loginPage());
  const flash = req.query.ok
    ? { type: 'ok', message: String(req.query.ok) }
    : req.query.err
      ? { type: 'err', message: String(req.query.err) }
      : null;
  res.send(dashboardPage({ feeds: db.listFeeds(), baseUrl: baseUrl(req), flash }));
});

app.post('/login', (req, res) => {
  const ip = req.ip;
  if (!auth.loginAllowed(ip)) {
    return res.status(429).send(loginPage({ error: 'Too many attempts. Try again in 15 minutes.' }));
  }
  if (!auth.checkPassword(req.body.password)) {
    auth.recordFailedLogin(ip);
    return res.status(401).send(loginPage({ error: 'Wrong password.' }));
  }
  setSessionCookie(res, req);
  res.redirect('/admin');
});

app.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.redirect('/admin');
});

app.post('/feeds', requireAdmin, (req, res) => {
  const input = validateFeedInput(req.body);
  if (input.error) return res.redirect(`/admin?err=${encodeURIComponent(input.error)}`);
  db.createFeed(input);
  res.redirect(`/admin?ok=${encodeURIComponent('Feed created — copy its URL into your podcast app.')}`);
});

app.post('/feeds/:id/update', requireAdmin, (req, res) => {
  const feed = db.getFeedById(Number(req.params.id));
  if (!feed) return res.redirect('/admin');
  const input = validateFeedInput(req.body);
  if (input.error) return res.redirect(`/admin?err=${encodeURIComponent(input.error)}`);
  db.updateFeed(feed.id, input);
  invalidate(feed.token);
  res.redirect(`/admin?ok=${encodeURIComponent('Feed updated.')}`);
});

app.post('/feeds/:id/regenerate', requireAdmin, (req, res) => {
  const feed = db.getFeedById(Number(req.params.id));
  if (!feed) return res.redirect('/admin');
  invalidate(feed.token);
  db.regenerateToken(feed.id);
  res.redirect(`/admin?ok=${encodeURIComponent('New secret URL generated — update your podcast app.')}`);
});

app.post('/feeds/:id/delete', requireAdmin, (req, res) => {
  const feed = db.getFeedById(Number(req.params.id));
  if (feed) {
    invalidate(feed.token);
    db.deleteFeed(feed.id);
  }
  res.redirect(`/admin?ok=${encodeURIComponent('Feed deleted.')}`);
});

app.get('/healthz', (req, res) => res.send('ok'));

const port = parseInt(process.env.PORT, 10) || 3000;
app.listen(port, () => console.log(`podproxy listening on :${port}`));
