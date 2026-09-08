# Repository instructions

- **Product:** Read [PRODUCT.md](PRODUCT.md) before changing user-facing behavior.
- **Design:** Read [DESIGN.md](DESIGN.md) before editing the interface or graphics.
- **Code:** Read [code standards](docs/agents/code-standards.md) before creating,
  moving, editing or reviewing application code.
- **Domain:** Read [domain guidance](docs/agents/domain.md) before exploring code.
- **Issues:** Read [the local tracker workflow](docs/agents/issue-tracker.md)
  before creating, reading or updating issues and specs; read
  [triage labels](docs/agents/triage-labels.md) when assigning status.
- **Deployment:** Read [setup instructions](docs/setup/widgets.md) before changing
  publication or integration configuration.

Use [README.md](README.md) for local setup and validation commands. For code or
build changes, complete `pnpm check`; for browser behavior, assets or test setup
changes, also complete `pnpm e2e`. Report any checks that could not run.
