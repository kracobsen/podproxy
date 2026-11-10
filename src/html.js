function esc(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const CSS = `
:root {
  --bg: #0f1115; --panel: #181b22; --panel2: #1f232c; --border: #2a2f3a;
  --text: #e8eaf0; --muted: #9aa3b2; --accent: #7c5cff; --accent2: #5cc8ff;
  --danger: #ff5c6c; --ok: #4ade80; --radius: 12px;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
a { color: var(--accent2); }
.wrap { max-width: 860px; margin: 0 auto; padding: 24px 16px 64px; }
header.top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 28px;
}
.logo { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 700; }
.logo .dot {
  width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
  background: linear-gradient(135deg, var(--accent), var(--accent2)); font-size: 16px;
}
.card {
  background: var(--panel); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 20px; margin-bottom: 16px;
}
h1 { font-size: 22px; margin: 0; }
h2 { font-size: 15px; margin: 0 0 14px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
label { display: block; font-size: 13px; color: var(--muted); margin: 12px 0 4px; }
input[type=text], input[type=url], input[type=password] {
  width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--panel2); color: var(--text); font-size: 15px;
}
input:focus { outline: none; border-color: var(--accent); }
button {
  padding: 9px 16px; border-radius: 8px; border: none; cursor: pointer;
  background: var(--accent); color: #fff; font-size: 14px; font-weight: 600;
}
button.secondary { background: var(--panel2); border: 1px solid var(--border); color: var(--text); }
button.danger { background: transparent; border: 1px solid var(--danger); color: var(--danger); }
button.small { padding: 5px 10px; font-size: 13px; }
.actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.feed { padding: 18px 20px; }
.feed-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.feed-name { font-size: 17px; font-weight: 700; }
.feed-title { color: var(--muted); font-size: 13px; }
.upstream { color: var(--muted); font-size: 13px; word-break: break-all; margin-top: 2px; }
.feedurl {
  display: flex; gap: 8px; align-items: center; margin-top: 12px;
  background: var(--panel2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px;
}
.feedurl code { flex: 1; font-size: 13px; word-break: break-all; color: var(--accent2); }
details.edit { margin-top: 12px; }
details.edit summary { cursor: pointer; color: var(--muted); font-size: 13px; user-select: none; }
.flash { border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 14px; }
.flash.ok { background: rgba(74,222,128,.1); border: 1px solid rgba(74,222,128,.4); color: var(--ok); }
.flash.err { background: rgba(255,92,108,.1); border: 1px solid rgba(255,92,108,.4); color: var(--danger); }
.empty { color: var(--muted); text-align: center; padding: 40px 0; }
.hint { color: var(--muted); font-size: 13px; margin-top: 8px; }
form.inline { display: inline; }
.login-box { max-width: 380px; margin: 12vh auto 0; }
`;

const COPY_JS = `
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    const old = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = old; }, 1200);
  } catch { prompt('Copy the feed URL:', btn.dataset.copy); }
});
`;

function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body><div class="wrap">${body}</div><script>${COPY_JS}</script></body>
</html>`;
}

function loginPage({ error } = {}) {
  return layout('PodProxy — Login', `
  <div class="card login-box">
    <div class="logo" style="margin-bottom:16px"><span class="dot">🎙</span> PodProxy</div>
    ${error ? `<div class="flash err">${esc(error)}</div>` : ''}
    <form method="post" action="/login">
      <label for="password">Admin password</label>
      <input type="password" id="password" name="password" autofocus required>
      <div class="actions"><button type="submit">Sign in</button></div>
    </form>
  </div>`);
}

function feedFields(feed = {}) {
  return `
    <label>Name (only shown here, to tell your copies apart)</label>
    <input type="text" name="name" required maxlength="200" value="${esc(feed.name)}" placeholder="My Podcast — archive run">
    <label>Upstream feed URL</label>
    <input type="url" name="upstream_url" required maxlength="2000" value="${esc(feed.upstream_url)}" placeholder="https://example.com/feed.xml">
    <label>Custom title (shown in your podcast app; leave empty to keep the original)</label>
    <input type="text" name="custom_title" maxlength="300" value="${esc(feed.custom_title)}" placeholder="My Podcast (Archive)">
    <label>Custom artwork URL (optional, helps tell copies apart)</label>
    <input type="url" name="custom_image_url" maxlength="2000" value="${esc(feed.custom_image_url)}" placeholder="https://…/cover.jpg">`;
}

function feedCard(feed, baseUrl) {
  const feedUrl = `${baseUrl}/f/${feed.token}.xml`;
  return `
  <div class="card feed">
    <div class="feed-head">
      <div>
        <div class="feed-name">${esc(feed.name)}</div>
        ${feed.custom_title ? `<div class="feed-title">Title override: “${esc(feed.custom_title)}”</div>` : ''}
        <div class="upstream">↳ ${esc(feed.upstream_url)}</div>
      </div>
      <form class="inline" method="post" action="/feeds/${feed.id}/delete"
            onsubmit="return confirm('Delete this feed? Apps subscribed to it will stop updating.')">
        <button class="danger small" type="submit">Delete</button>
      </form>
    </div>
    <div class="feedurl">
      <code>${esc(feedUrl)}</code>
      <button class="secondary small" type="button" data-copy="${esc(feedUrl)}">Copy</button>
    </div>
    <details class="edit">
      <summary>Edit</summary>
      <form method="post" action="/feeds/${feed.id}/update">
        ${feedFields(feed)}
        <div class="actions"><button type="submit">Save</button></div>
      </form>
      <form method="post" action="/feeds/${feed.id}/token"
            onsubmit="return confirm('Change the secret URL? The current URL stops working.')">
        <label>Set secret URL (paste an existing PodProxy feed URL or its token, e.g. to keep a URL after moving servers)</label>
        <input type="text" name="token" required maxlength="2000" autocomplete="off" placeholder="https://…/f/0123456789abcdef0123456789abcdef.xml">
        <div class="actions"><button class="secondary small" type="submit">Set secret URL</button></div>
      </form>
      <form method="post" action="/feeds/${feed.id}/regenerate"
            onsubmit="return confirm('Generate a new secret URL? The old URL stops working and you must re-add the feed in your app.')">
        <div class="actions"><button class="secondary small" type="submit">Regenerate secret URL</button></div>
      </form>
    </details>
  </div>`;
}

function dashboardPage({ feeds, baseUrl, flash }) {
  const flashHtml = flash
    ? `<div class="flash ${flash.type === 'err' ? 'err' : 'ok'}">${esc(flash.message)}</div>`
    : '';
  const list = feeds.length
    ? feeds.map((f) => feedCard(f, baseUrl)).join('')
    : `<div class="card empty">No feeds yet — add one above, then paste its URL into your podcast app.</div>`;
  return layout('PodProxy', `
  <header class="top">
    <div class="logo"><span class="dot">🎙</span> PodProxy</div>
    <form method="post" action="/logout"><button class="secondary small" type="submit">Log out</button></form>
  </header>
  ${flashHtml}
  <div class="card">
    <h2>Add a feed</h2>
    <form method="post" action="/feeds">
      ${feedFields()}
      <label>Secret URL (optional — paste an existing PodProxy feed URL or its token to keep using it; leave empty to generate a new one)</label>
      <input type="text" name="token" maxlength="2000" autocomplete="off" placeholder="https://…/f/0123456789abcdef0123456789abcdef.xml">
      <div class="actions"><button type="submit">Create proxied feed</button></div>
    </form>
    <p class="hint">Each feed gets a secret URL. Anyone with the URL can read the feed, so treat it like a password — regenerate it if it leaks.</p>
  </div>
  <h2>Your feeds</h2>
  ${list}`);
}

module.exports = { loginPage, dashboardPage };
