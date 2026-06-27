# Contributing — Sophia SEO Suite

This is a **proprietary SophiaXT product** (see [`LICENSE`](LICENSE)). Contributions
are limited to authorized SophiaXT team members and collaborators under agreement.
External pull requests are not accepted without prior arrangement.

## Ground rules (read before any change)

These come from [`CLAUDE.md`](CLAUDE.md) and are non-negotiable:

1. **Never modify Sophia Stack.** It is a read-only reference
   (`Chorozion/Sophia-Stack`). Site-side needs go in
   [`docs/sophia-stack-extension-requirements.md`](docs/sophia-stack-extension-requirements.md)
   and the cross-session coordination channel — not into Stack source.
2. **Safety over velocity.** No tool edits a live site directly. Everything flows
   **draft → preview → approve → apply → rollback**. Writes go through
   `ctx.site.patch` (extension) or `connector.applyChangeSet` — never the model/
   files directly. See [`docs/owner-safe-editing.md`](docs/owner-safe-editing.md).
3. **Security is paramount.** No hardcoded secrets, no plaintext secret storage,
   no aggressive crawling, none of the prohibited features in
   [`SECURITY.md`](SECURITY.md).

## Workflow

- Branch from `main`: `feat/<short>`, `fix/<short>`, `docs/<short>`.
- Keep modules pure where possible; side effects live at the edges (workers,
  connectors, db, the extension entry).
- Validate external input with **Zod** at the boundary.
- Update docs + `CHANGELOG.md` when behavior changes.
- Run `pnpm typecheck` and `pnpm build` before opening a PR.

## Commit & attribution

- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`,
  `test:`, optionally scoped (e.g. `feat(extension): …`).
- All commits in this repo are authored as **Sophia** for branding:
  `Sophia <sophia@sophiaxt.com>` (set repo-locally — see below).

```bash
git config user.name  "Sophia"
git config user.email "sophia@sophiaxt.com"
```

## PRs

- One focused change per PR. Fill in the PR template.
- A PR that adds a site-mutating path must show it goes through ChangeSet/approval,
  writes an audit entry, and has a rollback story (or the missing-capability UX).
