# Owner-Safe Editing

> File: docs/owner-safe-editing.md · Companion: `SECURITY.md`, `ARCHITECTURE.md`
> The product's central promise: **owners cannot break their website.**

A website owner should be able to log into their backend and use SEO tools
**safely** — without messing up the site's layout or content. This document is
the design contract every module and connector must honor.

## The guarantee

> No automated SEO action edits a live site directly. Every change is **drafted**,
> **previewed**, **approved**, **logged**, and **reversible** (when the platform
> supports versioning). Connectors are **non-destructive** by contract.

## The lifecycle every change follows

```
 analyze ─► propose ─► DRAFT ─► preview/diff ─► APPROVE ─► apply ─► VERSION ─► (rollback)
 (read)    (plan)      (db)      (owner sees)    (owner)   (conn)   (recorded)   (one click)
```

1. **Analyze** — read-only. Modules pull site data through the connector and
   produce findings. Nothing is written.
2. **Propose** — a module's `plan()` produces a **ChangeSet**: a structured,
   described, previewable edit. Still nothing on the site.
3. **Draft** — the ChangeSet is stored as a `Draft` (status `DRAFT`). Generated
   *content* (Tier 2) is additionally marked unpublished.
4. **Preview / diff** — the owner sees exactly what will change (before/after,
   affected pages/blocks, rendered preview where possible).
5. **Approve** — an authorized user approves. Tier 3 can require multi-step
   approval workflows.
6. **Apply** — only now does the connector touch the site, via its safe primitive
   (Sophia Stack: validate-before-commit patch ops).
7. **Version** — the apply produces a recorded `Version` with before/after.
8. **Rollback** — one action reverts to the prior `Version` when the connector
   reports `supportsRollback`.

## Guardrails by layer

**Module layer**
- Modules can only *analyze* and *plan*. They have no apply capability.
- `plan()` must produce additive or explicitly-replacing changes — never blind
  deletes. A replacement records the prior value.

**Connector layer**
- The interface has **no** "delete page", "overwrite file", or "wipe content"
  verb. Edits are scoped to metadata, additive blocks, and approved replacements.
- `applyChangeSet` requires an `approvedBy` actor — it refuses unapproved sets.
- Each connector advertises `capabilities`; the UI degrades safely when a
  capability (e.g. rollback) is missing: louder confirmation + manual-revert note.

**Data layer**
- Every apply writes an **audit record**: actor, timestamp, ChangeSet, resulting
  Version, before/after snapshot reference.
- Drafts and Versions are first-class rows (see `packages/db`).

**UI layer**
- No "apply now" without a preview step.
- Destructive-looking actions (page replacement) require typed confirmation.
- Content generation toggles default to **Draft**, never auto-publish.

## What "non-destructive" means concretely (Sophia Stack)

- Title/meta edits → `mset` on model paths (validate-before-commit; auto-snapshot).
- Schema/JSON-LD → `add` an `html` block (additive; existing blocks untouched).
- Publish → the deployer's backup → atomic swap → health-verify → rollback flow.
- Rollback → `POST /api/sophia/rollback` (today: last snapshot; per-version once
  extension R4 lands).

If a target platform can't guarantee reversibility, the connector reports
`supportsRollback: false`, and the UI:
1. shows a stronger warning,
2. captures a full before-snapshot in our DB,
3. records a manual revert procedure with the Version.

## Anti-footgun checklist (every new feature)

- [ ] Read-only path produces findings without writing.
- [ ] Mutating path produces a ChangeSet + preview, not a direct write.
- [ ] Apply requires approval (`approvedBy`).
- [ ] Apply writes an audit record + Version.
- [ ] A rollback path exists, or the missing-capability UX is wired.
- [ ] Generated content defaults to Draft.
