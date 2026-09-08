# Deployment and widget setup

## GitHub Pages

1. Push the project to `main` in `smurygin/smurygin.github.io`.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
3. Set the Actions variables and secrets listed below.
4. Run **Deploy GitHub Pages** and verify the published site after both jobs finish.

The [workflow](../../.github/workflows/pages.yml) builds and exports snapshots
before uploading `dist/website/browser`. It also refreshes activity on a schedule;
use **Run workflow** when an immediate refresh is needed.

## Configuration

| Setting                                      | Storage          | Purpose                                      |
| -------------------------------------------- | ---------------- | -------------------------------------------- |
| `LOCATION`                                   | Actions variable | City and country for local time and weather. |
| `STEAM_ID`                                   | Actions variable | Owner's 64-bit Steam ID.                     |
| `STEAM_API_KEY`                              | Actions secret   | Steam Web API credential.                    |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Actions secrets  | Spotify application credentials.             |
| `SPOTIFY_REFRESH_TOKEN`                      | Actions secret   | Authorization to read listening history.     |

Location also accepts a default in `public/site-config.json`.
Edit the workplace name and URL in `PROFILE` in
`src/app/constants/profile.const.ts`; workplace details are part of the static profile.
Nonempty environment values override those defaults during export. Clear both
sources to remove a setting. Keep credentials in Actions secrets or the ignored
local `.env`; everything in `public/` is public.

Time and weather share the owner's configured location. Verify the resolved city
and timezone when place names are ambiguous. Weather needs no application key.

## Steam

Obtain a [Steam Web API key](https://steamcommunity.com/dev/apikey) and configure
the owner ID. Make the profile's **Game details** and total playtime visible.

The exporter selects the largest `rtime_last_played` from the accessible library
and downloads its icon for same-origin Canvas rendering. An empty library and an
unavailable library produce different widget states.

## Spotify

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   and register `http://127.0.0.1:8888/callback` as its redirect URI.
2. Copy `.env.example` to `.env` and fill in the client ID and client secret.
3. Run `pnpm spotify:authorize`, open its URL and authorize
   `user-read-recently-played` with the owner's account.
4. Copy the value saved in `.env.spotify-token` into `SPOTIFY_REFRESH_TOKEN` in
   `.env` and Actions secrets, then delete the temporary token file.
5. Play a track, run the deployment workflow and verify the last-played details.

The helper refuses to overwrite `.env.spotify-token`. Remove an old token file
before authorizing again. If account access is rejected, check the app's user
access settings and Spotify's current development-mode requirements.

Refresh tokens are exchanged during export. Reauthorize if access is revoked;
update the stored secret if the provider replaces the refresh token. The workflow
has no permission to update repository secrets.

## Local snapshots

```sh
pnpm build
pnpm snapshots
python3 -m http.server 4300 --bind 127.0.0.1 --directory dist/website/browser
```

Open `http://127.0.0.1:4300`. The exporter reads `.env` and writes only public widget
data into the build. `pnpm start` serves source assets and does not load these
exported snapshots.

## Release checks

- Run `pnpm check` and `pnpm e2e`.
- Review the biography, contact links, location and workplace.
- Verify Steam and Spotify with the owner's accounts. Automated tests mock provider
  responses and cannot establish account access.
- Confirm that published game and listening activity are intended to be public.
- Review indexing in `public/robots.txt`, `src/index.html` and
  `src/app/services/seo.service.ts`; it is currently disabled.

The widget update timestamp makes delayed scheduled exports visible. A provider
failure affects its own snapshot; inspect export warnings and credentials if it
stays unavailable. A failed deployment leaves the previous published build intact.
