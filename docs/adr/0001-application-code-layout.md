---
status: accepted
---

# Use role-based application folders and one export per file

Application code uses the role-based `app/` layout documented in
`docs/agents/code-standards.md`, with one exported symbol per source file. This
trades some filesystem depth and additional imports for predictable discovery,
explicit ownership, and small review units; existing code migrates only when its
module is materially changed so unrelated work stays scoped.
