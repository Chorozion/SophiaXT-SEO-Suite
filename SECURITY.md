# Security Policy & Principles — Sophia SEO Suite

> Security is paramount. Every payload, secret, token, and customer-facing
> surface is evaluated for security **before** feature velocity. No exceptions.

This document is both a policy (how to report issues) and an engineering
contract (rules the code must uphold).

## 1. Secrets

- **Never hardcode secrets.** All keys/tokens/passwords come from environment
  variables (`.env`, never committed) — see `.env.example` for the shape.
- **Never store secrets in plaintext at rest.** Connector credentials persisted
  in the database are encrypted with `CONNECTOR_ENCRYPTION_KEY` (AES-256-GCM).
  The encryption key itself lives only in env.
- **Never log secrets.** Logging utilities must redact token/key/password fields.
- **Least privilege.** A connector requests the narrowest scope token the target
  platform offers (owner/admin only where unavoidable).

## 2. Safe editing (anti-footgun)

The product's core promise is that owners can't break their site:

- **No direct live edits by default.** Modules produce **ChangeSets**; nothing
  reaches the site until an owner approves.
- **Preview before publish.** Every change is shown as a diff/preview.
- **Draft-first content.** AI-generated content defaults to `DRAFT`.
- **Audit everything.** Every automated change is logged with actor, timestamp,
  and before/after.
- **Rollback path.** Publishes are reversible when the connector exposes
  versioning; if not, the UI escalates the confirmation and records a manual
  revert procedure.
- **Connectors are non-destructive.** The interface forbids deleting or
  overwriting existing content; edits are additive or explicitly-approved
  replacements with a recorded prior version.

## 3. Crawling conduct

- Respect `robots.txt` (`CRAWLER_RESPECT_ROBOTS=true` by default).
- Conservative concurrency + per-request delay (env-controlled).
- Identify with an honest `User-Agent`.
- **Never scrape aggressively.** No hammering, no circumvention of rate limits.

## 4. Prohibited features (will not be built)

- Spam / mass low-quality content tools.
- Auto-comment / auto-DM bots.
- Faked rankings, faked Google indexing, or any deceptive SERP manipulation.
- Ranking **guarantees** or promises.
- Cloaking, link schemes, or other black-hat tactics.

## 5. AuthN / AuthZ

- Role-based permissions (owner / agency / developer / client) gate every
  mutating action; approval workflows gate publishes (Tier 3).
- Session secret from env; sessions signed, short-lived, rotated on privilege
  change.
- Multi-tenant isolation: a user can only reach sites they're granted.

## 6. Data handling

- Store the minimum needed. Crawl artifacts are cache, not a system of record,
  and are purgeable.
- No third-party data sharing without explicit owner consent.

## 7. Reporting a vulnerability

Email **security@sophiaxt.com** with details and reproduction steps. Do not open
a public issue for security reports. We aim to acknowledge within 72 hours.

## 8. Engineering checklist (PR gate)

- [ ] No secret added to source or committed `.env`.
- [ ] External input validated with Zod at the boundary.
- [ ] New site-mutating path goes through a ChangeSet + approval, not a direct write.
- [ ] New persisted credential is encrypted at rest.
- [ ] New logging redacts sensitive fields.
- [ ] New crawl path respects robots + politeness settings.
