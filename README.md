<div align="center">

<img src="public/favicon.svg" alt="Dmitry Smurygin — site mark" width="80" height="80">

# Dmitry Smurygin

**A personal corner of the web, in four shades of green.**

A personal site with an interactive lab and a canvas of moving ink.

[Visit the site](https://smurygin.github.io/) · [Features](#features) · [Quick start](#getting-started) · [Deployment](#deployment) · [Docs](#further-reading)

[![License: MIT](https://img.shields.io/badge/License-MIT-243a1f?style=flat-square&labelColor=435639)](LICENSE)

</div>

---

## Features

A single-page personal site with a four-tone green palette, bundled pixel
typography and an interactive ink background. The introduction stays in focus;
the lab opens when you want to explore.

- **Personal card** — biography, workplace and contact links in one place.
- **Interactive canvas** — moving ink and dithered widget artwork.
- **Adaptive theme** — follows your system, with saved light and dark overrides.
- **Optional motion** — a pause control and support for reduced-motion preferences.
- **Static delivery** — a prerendered Angular site hosted on GitHub Pages.

### Inside the lab

| Widget      | At a glance                                   |
| :---------- | :-------------------------------------------- |
| **Time**    | Local time for the configured location.       |
| **Weather** | Current conditions, temperature and humidity. |
| **Steam**   | Most recently played game and total playtime. |
| **Spotify** | Last played track, artist and album.          |

Steam and Spotify use activity snapshots exported by GitHub Actions. They show
listening and gaming history, with update timestamps, rather than live playback.
Credentials stay in the export environment; the site receives only public data.

## Getting started

Use **Node.js 24.19.0** (see [`.nvmrc`](.nvmrc)) and **pnpm 11**.
Browser tests also require **Python 3**.

```sh
pnpm install --frozen-lockfile
pnpm start
```

<details>
<summary><strong>Make it yours — content, appearance and integrations</strong></summary>

| What to edit                            | Where                                                                      |
| :-------------------------------------- | :------------------------------------------------------------------------- |
| Profile, workplace and links            | [`src/app/constants/profile.const.ts`](src/app/constants/profile.const.ts) |
| Copy, accessibility labels and metadata | [`src/app/i18n/en.json`](src/app/i18n/en.json)                             |
| Public location                         | [`public/site-config.json`](public/site-config.json)                       |
| Colors, typography and layout           | [`src/styles.scss`](src/styles.scss)                                       |
| Local integration credentials           | Copy [`.env.example`](.env.example) to `.env`                              |

`PROFILE` stores identity and contact data; `en.json` stores the biography and
interface copy. Empty workplace, role and contact fields are omitted from the
page instead of showing template placeholders.

The development server uses the source assets in `public/`. To preview exported
Steam and Spotify data, follow the [local snapshot setup](docs/setup/widgets.md#local-snapshots).

</details>

## Quality checks

```sh
# Formatting, lint, unit tests and a production build
pnpm check

# Install the browser once, then run browser tests
pnpm exec playwright install chromium
pnpm e2e
```

Browser tests serve the production build over static HTTP. Pull requests run
the project checks and Chromium tests through [GitHub Actions](.github/workflows/check.yml).

## Deployment

The [Pages workflow](.github/workflows/pages.yml) builds and deploys pushes to
`main`. It also refreshes activity snapshots on a schedule and supports manual runs.

<details>
<summary><strong>Build and export snapshots locally</strong></summary>

```sh
pnpm build
pnpm snapshots
```

The publishable directory is **`dist/website/browser`**. Snapshot export reads
the local `.env` or the Actions environment.

</details>

See the **[deployment and widget guide](docs/setup/widgets.md)** for GitHub Pages
setup, Steam and Spotify credentials, and release checks.

> Search indexing is currently disabled. Review the profile, canonical URL and
> indexing settings before making the site discoverable.

## Further reading

| Guide                                | Covers                                          |
| :----------------------------------- | :---------------------------------------------- |
| [Product](PRODUCT.md)                | Purpose, scope and widget behavior              |
| [Design](DESIGN.md)                  | Palette, typography, interaction and motion     |
| [Repository instructions](AGENTS.md) | Conventions for contributing with coding agents |
| [Asset provenance](docs/assets.md)   | Font and test image sources                     |

Generated output, local credentials and agent state are excluded by `.gitignore`.
Commit the lockfile and `.env.example`; keep secrets out of `public/`.

---

Licensed under [MIT](LICENSE). Bundled third-party assets retain their own
licenses and ownership; see [asset provenance](docs/assets.md).
