# Product

## Purpose

A personal introduction for Dmitry Smurygin's colleagues and acquaintances, with
an optional lab of small interactive widgets. The first screen communicates who
the owner is, what he does and how to contact him. The lab supports that introduction.

## Scope

- A single English page with static biography and contact links.
- A lab that starts closed and contains time, weather, Steam and Spotify widgets.
- Static workplace details in `PROFILE`; owner-managed location and integration
  credentials. Visitors can
  open the lab and pause decorative motion; configuration stays outside the UI.
- Color theme follows the system by default. Visitors can select light or dark
  mode, keep that choice across visits, or return to automatic mode.
- Static hosting on GitHub Pages. Credentials are used only during snapshot export.

## Widgets

| Widget  | Behavior                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------ |
| Time    | Show the owner's local time using the timezone resolved for the configured location.                         |
| Weather | Show current conditions, temperature in Celsius and relative humidity from Open-Meteo for the same location. |
| Steam   | Show the most recently played game reported by the accessible library, its icon and total playtime in hours. |
| Spotify | Show the last track in listening history, its artist, album and listening timestamp.                         |

Steam and Spotify show exported activity snapshots, not live playback. Show the
snapshot update time and flag data older than two hours. Distinguish loading,
empty results and unavailable integrations; use real data or an explicit state.
The weather widget credits its data source.

## Extension boundary

Each lab plugin owns its component, data access and view state. Registration uses
`LabPlugin` and `LAB_PLUGINS`; the panel renders the common contract. Keep plugins
independent so the collection can grow without provider-specific panel logic.

## Presentation

The personal introduction remains primary. New widgets follow the shared visual
language and motion accessibility rules in [DESIGN.md](DESIGN.md).
Owner configuration and release verification belong in
[deployment and widget setup](docs/setup/widgets.md).
