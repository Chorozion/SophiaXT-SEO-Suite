# Summary

<!-- What does this PR change and why? One or two sentences. -->

## Type
- [ ] feat  [ ] fix  [ ] docs  [ ] refactor  [ ] chore  [ ] test

## Safety & security checklist
- [ ] No secret added to source or a committed `.env`.
- [ ] External input validated with Zod at the boundary.
- [ ] Any site-mutating path goes through a ChangeSet / `ctx.site.patch` + approval — **not** a direct model/file write.
- [ ] New persisted credential is encrypted at rest.
- [ ] New logging redacts sensitive fields.
- [ ] New crawl path respects robots + politeness settings.
- [ ] Did **not** modify Sophia Stack source (needs → requirements doc + coordination channel).
- [ ] No absolute local paths or system-specific info in tracked files.

## Verification
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] Docs / `CHANGELOG.md` updated if behavior changed
