import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
if (!clientId || !clientSecret) {
  throw new Error(
    'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env first.',
  );
}
const redirectUri = 'http://127.0.0.1:8888/callback';
const state = randomBytes(32).toString('hex');
const authorizeUrl = new URL('https://accounts.spotify.com/authorize');
authorizeUrl.search = new URLSearchParams({
  client_id: clientId,
  response_type: 'code',
  redirect_uri: redirectUri,
  scope: 'user-read-recently-played',
  state,
  show_dialog: 'true',
}).toString();

const server = createServer((request, response) => {
  const url = new URL(request.url, redirectUri);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (request.method !== 'GET' || url.pathname !== '/callback') {
    response.writeHead(404).end('Not found');
    return;
  }
  if (url.searchParams.get('state') !== state) {
    response
      .writeHead(400)
      .end('Invalid authorization state. Use the link printed by the helper.');
    return;
  }
  const code = url.searchParams.get('code');
  if (!code || url.searchParams.has('error')) {
    response
      .writeHead(400)
      .end('Authorization was declined. Restart the helper to try again.');
    server.close();
    return;
  }
  server.close();
  void exchange(code)
    .then(() => {
      response.end(
        'Connected. The refresh token was saved to .env.spotify-token. Copy its value into .env, then run pnpm build and pnpm snapshots.',
      );
      console.log(
        'Saved .env.spotify-token. Copy SPOTIFY_REFRESH_TOKEN into .env, then delete .env.spotify-token.',
      );
    })
    .catch(() => {
      response
        .writeHead(502)
        .end(
          'Could not complete authorization. Check the app credentials and redirect URI, then restart the helper.',
        );
      console.error('Spotify authorization failed. No tokens were printed.');
      process.exitCode = 1;
    });
});

async function exchange(code) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!response.ok) throw new Error('Token exchange failed');
  const token = await response.json();
  if (
    typeof token.refresh_token !== 'string' ||
    token.refresh_token.length === 0 ||
    /[\r\n\0]/.test(token.refresh_token)
  ) {
    throw new Error('Missing refresh token');
  }
  await writeFile(
    '.env.spotify-token',
    `SPOTIFY_REFRESH_TOKEN=${JSON.stringify(token.refresh_token)}\n`,
    { mode: 0o600, flag: 'wx' },
  );
}

const deadline = setTimeout(() => {
  console.error('Authorization timed out. Run the helper again.');
  server.close();
}, 300000);
deadline.unref();
server.on('close', () => clearTimeout(deadline));
server.on('error', () => {
  clearTimeout(deadline);
  console.error(
    'Cannot listen on 127.0.0.1:8888. Free that port and try again.',
  );
  process.exitCode = 1;
});
server.listen(8888, '127.0.0.1', () => {
  console.log(
    `Open this URL in a browser on this computer:\n${authorizeUrl.href}`,
  );
});
