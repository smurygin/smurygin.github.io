# Local issue tracker

Issues and specs live under `.scratch/<feature-slug>/`.

## Files and status

- Spec: `spec.md` within the feature directory.
- Implementation tickets: one file per ticket at `issues/<NN>-<slug>.md`, numbered from `01`.
- Triage status: a `Status:` line near the top, using [triage-labels.md](triage-labels.md).
- Discussion: append under `## Comments` at the bottom of the relevant ticket.

When a skill says to publish to the issue tracker, create the corresponding local file. When it says to fetch a ticket, read the referenced path or numbered ticket.

## Wayfinding

A wayfinding effort uses `.scratch/<effort>/map.md` with Notes, Decisions-so-far, and Fog sections, plus one child file per ticket at `issues/NN-<slug>.md`.

Each child contains its question, `Type: research|prototype|grilling|task`, and its work state. `Status: claimed` and `Status: resolved` are wayfinding states, separate from triage labels. An optional `Blocked by: NN, NN` line lists dependencies; all listed tickets must be resolved before work begins.

1. Select the first numbered ticket that is open, unblocked, and unclaimed.
2. Save `Status: claimed` before starting work.
3. Resolve by appending the answer under `## Answer`, setting `Status: resolved`, and adding a gist plus a link to the map's Decisions-so-far section.

Resolution is complete when both the child's answer/status and the map pointer are saved.
