# Security (threat model & controls)

> File: docs/security.md · Policy companion: `../SECURITY.md`
> `../SECURITY.md` is the policy + PR gate. This doc is the threat model.

## Assets to protect

1. **Connected sites** — the live websites the suite can edit. Highest value;
   damage is visible and reputational.
2. **Connector credentials** — per-site editor tokens / API keys.
3. **AI provider keys** — billable secrets.
4. **Tenant data** — which orgs own which sites; reports; drafts.
5. **The audit trail** — must be trustworthy (non-repudiation).

## Primary threats & controls

| Threat | Control |
| --- | --- |
| Tool corrupts/defaces a live site | Non-destructive connector contract; draft→approve→apply; validate-before-commit; rollback. |
| Credential theft (at rest) | AES-256-GCM encryption with `CONNECTOR_ENCRYPTION_KEY`; key only in env. |
| Credential leak (in transit/logs) | HTTPS only; logging redaction of token/key/password fields. |
| Secret in source / git | `.env` git-ignored; `.env.example` is shape-only; PR gate checks. |
| Over-privileged token | Request least scope; pursue scoped tokens (extension R6). |
| Cross-tenant access | RBAC on every mutating route; site access scoped to memberships. |
| Aggressive crawling / abuse complaints | robots respected; conservative concurrency + delay; honest UA. |
| Prompt-injection via crawled content into AI modules | AI output is **draft-only**, never auto-applied; treated as untrusted; validated with Zod; no tool-execution from page content. |
| Replay / double-apply | Idempotency keys on apply (and pursue server-side, extension R5). |
| Audit tampering | Append-only audit records; before/after snapshots referenced, not mutated. |

## Trust boundaries

```
[browser/owner] ──auth/session──► [dashboard server actions] ──RBAC──► [core/workers]
                                                                   │
                                          encrypted creds ◄────────┤
                                                                   ▼
                                            [connector] ──Bearer/HTTPS──► [target site]
```

- The **target site** is semi-trusted: its *content* (for crawling/AI) is
  **untrusted input**; its *API* is trusted only as far as the stored token's
  scope.
- **AI provider** responses are untrusted: parsed, never executed, draft-only.

## Secrets inventory (names only — values live in env)

`SESSION_SECRET`, `DATABASE_URL`, `REDIS_URL`, `ANTHROPIC_API_KEY` /
`OPENAI_API_KEY` / `INCEPTION_API_KEY`, `SOPHIA_STACK_API_TOKEN`,
`CONNECTOR_ENCRYPTION_KEY`. None are hardcoded; all are read at runtime.

## Hard "won't build" list (anti-abuse)

Spam content tools, auto-comment/DM bots, fake rankings, fake indexing, ranking
guarantees, cloaking, link schemes. These are out of scope by policy, not just
unimplemented.

## Open security work (tracked in TODO)

- Wire AES-256-GCM credential vault in `packages/shared`/`db`.
- Logging redaction utility + lint rule.
- RBAC enforcement middleware in the dashboard.
- Idempotency on connector apply.
