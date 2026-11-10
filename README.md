# PodProxy

Proxy podcast RSS feeds under your own URLs, with optional title and artwork
overrides. Lets you add the **same podcast several times** to a podcast app
(e.g. one subscription for new episodes, one for an archive binge) without the
app deduplicating them.

- Each proxied feed gets a secret, unguessable URL (`/f/<32-hex-token>.xml`) — that token is the feed protection.
- Admin GUI protected by a password, with brute-force rate limiting.
- Title (`<title>`, `<itunes:title>`) and artwork (`<itunes:image>`, `<image><url>`) rewritten at the channel level; everything else (episodes, enclosures) passes through untouched, so audio is served directly from the original host.
- Upstream feeds are cached in memory (default 5 min) and stale copies are served if the upstream is temporarily down.
- SQLite storage (Node's built-in `node:sqlite`), single small container, no build step.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ADMIN_PASSWORD` | **yes** | — | Password for the admin GUI. |
| `PUBLIC_BASE_URL` | no | request host | e.g. `https://pods.example.com`. Used to render feed URLs in the GUI. |
| `PORT` | no | `3000` | Listen port. |
| `DATA_DIR` | no | `/data` (in Docker) | Where the SQLite DB lives. |
| `FEED_CACHE_SECONDS` | no | `300` | Upstream cache TTL. |
| `SESSION_SECRET` | no | derived from password | Set to keep logins valid across password changes. |

## Deploy on Coolify

1. Push this directory to a Git repo (or use Coolify's "Docker Image" flow after building/pushing yourself).
2. In Coolify: **+ New → Application → your repo**, Build Pack: **Dockerfile**.
3. Set port to `3000`.
4. Under **Environment Variables**, add `ADMIN_PASSWORD` (and optionally `PUBLIC_BASE_URL=https://your-domain`).
5. Under **Persistent Storage**, add a volume mounted at `/data` (this keeps your feeds across redeploys — don't skip it).
6. Assign your domain, deploy, open `https://your-domain/admin`.

## Run locally

```sh
ADMIN_PASSWORD=changeme npm start
# open http://localhost:3000/admin
```

Requires Node ≥ 23.4 (uses built-in `node:sqlite`). Or with Docker:

```sh
docker build -t podproxy .
docker run -p 3000:3000 -e ADMIN_PASSWORD=changeme -v podproxy-data:/data podproxy
```

## Usage

1. Log in at `/admin`.
2. Add a feed: paste the original RSS URL, give it a name and a custom title like "My Podcast (Archive)".
3. Copy the generated secret URL into your podcast app ("add by URL").
4. Repeat with the same upstream URL and a different title for each extra copy.

Notes:
- To keep an existing secret URL (e.g. after moving to a new server on the same domain), paste the old feed URL or its 32-character token into "Secret URL" when adding the feed, or use "Set secret URL" under Edit on an existing feed. Only tokens in the generated format are accepted.
- Anyone with a feed's secret URL can read it — treat it like a password. Use "Regenerate secret URL" if one leaks (you'll need to re-add the feed in your app).
- Forms rely on `SameSite=Lax` cookies for CSRF protection; use a modern browser and serve over HTTPS (Coolify does this by default).
