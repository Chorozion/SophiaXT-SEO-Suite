# Screenshots — SEO half of the joint v1.5 demo (WS7)

Captured from the **real Sophia Stack** with the extension installed (not the mock).
The owner panel (`ctx.admin.registerPanel` → `/panel`) rendered live, server-seeded.

| File | Shows |
| --- | --- |
| `panel-audit.png` | SEO audit running — **78/100** with findings (missing description, JSON-LD, title length). |
| `panel-after-fixes.png` | After applying safe fixes — **90/100**, findings cleared, plus **Versions & Rollback** with two named snapshots (`seo: meta`, `seo: schema`) and per-change **Roll back**. |

![SEO audit](./panel-audit.png)
![After fixes + versions](./panel-after-fixes.png)

These are the SEO contribution to the joint "See it in action" section. The Sophia
Stack session can pull them into both READMEs via raw URLs (public repo):

```
https://raw.githubusercontent.com/Chorozion/SophiaXT-SEO-Suite/main/docs/screenshots/panel-audit.png
https://raw.githubusercontent.com/Chorozion/SophiaXT-SEO-Suite/main/docs/screenshots/panel-after-fixes.png
```

> Pending: capture the panel **inside the dashboard tab** (one-click install) once
> the Stack bumps `VERSION` to `1.5.0` so the `requires ">=1.5.0"` extension
> installs via the button; and a short GIF of the audit → apply → rollback loop.
