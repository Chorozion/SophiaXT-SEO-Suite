// Sophia SEO Suite — Sophia Stack extension entry.
//
// This is the REAL, installable integration (not the contract stub). It runs
// in-process inside a Sophia Stack deployment via the extension `ctx` API and:
//   - registers admin nav + owner settings,
//   - serves API routes under /api/extensions/sophia-seo-suite/*,
//   - runs a genuine SEO audit over the live Site Model,
//   - performs SAFE, owner-approved edits via ctx.site.patch
//     (validate-before-commit + snapshot + rollback + audit, automatic),
//   - logs every action, and listens to content-change hooks.
//
// Build posture follows docs/sophia-stack-readonly-analysis.md + the Stack's
// integration contract: reads via ctx.site.read(), writes ONLY via ctx.site.patch,
// AI via ctx.ai.generate(). Nothing touches the model or files directly.
//
// NOTE: this entry is intentionally self-contained ESM so the folder installs by
// copy with no build step. The richer roadmap engine lives in the TypeScript
// packages/core; unifying the two via an esbuild bundle is tracked in TODO.md.

const TITLE_MIN = 15;
const TITLE_MAX = 60;
const DESC_MIN = 50;
const DESC_MAX = 160;

const SEVERITY_PENALTY = { info: 0, low: 2, medium: 5, high: 10, critical: 20 };

export default {
  async activate(ctx) {
    ctx.logger.info(`Sophia SEO Suite v${ctx.manifest?.version ?? "?"}: activating`);

    // --- Owner-configurable settings ------------------------------------
    ctx.settings.register({
      defaultTitleSuffix: { type: "string", default: "" },
      targetKeywords: { type: "string", default: "" },
      autoAuditOnChange: { type: "boolean", default: true },
      tier: { type: "string", default: "starter" },
    });

    ctx.admin.registerNav({ label: "SEO Suite", path: "/admin/extensions/seo", icon: "search" });

    // --- Routes ----------------------------------------------------------

    // GET /audit — run a real audit over the live model. Read-only.
    ctx.routes.register("/audit", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const model = ctx.site.read();
      const result = auditModel(model);
      ctx.audit.log("audit.run", { findings: result.findings.length, score: result.score });
      h.send(res, 200, result);
    });

    // POST /plan-title { route, title? } — PREVIEW only, applies nothing.
    // Honors the draft → preview → approve flow: this is the preview step.
    ctx.routes.register("/plan-title", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const body = safeJson(await h.readBody(req));
      const route = body.route || "/";
      const model = ctx.site.read();
      const page = (model.pages || {})[route];
      if (!page) return h.send(res, 404, { error: `unknown route: ${route}` });

      let title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        title = await suggestTitle(ctx, route, page);
        if (title === null) return h.send(res, 400, { error: "AI not configured; provide a title" });
      }
      const suffix = ctx.settings.get("defaultTitleSuffix") || "";
      const after = title + suffix;
      // Preview only — NO patch.
      h.send(res, 200, {
        preview: true,
        change: { target: route, field: "title", before: page.title || "", after },
        note: "Preview only. POST /optimize-title to apply (validate-before-commit + rollback).",
      });
    });

    // POST /optimize-title { route, title? } — SAFE apply (admin/token approved).
    ctx.routes.register("/optimize-title", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const body = safeJson(await h.readBody(req));
      const route = body.route || "/";
      const model = ctx.site.read();
      const page = (model.pages || {})[route];
      if (!page) return h.send(res, 404, { error: `unknown route: ${route}` });

      let title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        title = await suggestTitle(ctx, route, page);
        if (title === null) return h.send(res, 400, { error: "AI not configured; provide a title" });
      }
      const suffix = ctx.settings.get("defaultTitleSuffix") || "";
      const r = ctx.site.patch([{ op: "mset", path: `pages.${route}.title`, value: title + suffix }]);
      ctx.audit.log("optimize-title", { route, by: actorOf(h), ok: r.ok });
      h.send(res, r.ok ? 200 : 400, r);
    });

    // POST /optimize-meta { route, description } — SAFE apply of a meta description.
    // Stored on model.seo (a valid model path); rendered in <head> once the Stack
    // ships native SEO metadata (see our request in the integration contract).
    ctx.routes.register("/optimize-meta", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const body = safeJson(await h.readBody(req));
      const route = body.route || "/";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      if (!description) return h.send(res, 400, { error: "description required" });
      const model = ctx.site.read();
      if (!(model.pages || {})[route]) return h.send(res, 404, { error: `unknown route: ${route}` });
      const r = ctx.site.patch([{ op: "mset", path: `pages.${route}.seo.description`, value: description }]);
      ctx.audit.log("optimize-meta", { route, by: actorOf(h), ok: r.ok });
      h.send(res, r.ok ? 200 : 400, { ...r, note: "Stored on model.seo; rendered once the Stack ships native SEO meta." });
    });

    // POST /add-schema { route, jsonLd } — ADDITIVE JSON-LD via an html block.
    ctx.routes.register("/add-schema", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const body = safeJson(await h.readBody(req));
      const route = body.route || "/";
      if (!body.jsonLd || typeof body.jsonLd !== "object") return h.send(res, 400, { error: "jsonLd object required" });
      const model = ctx.site.read();
      if (!(model.pages || {})[route]) return h.send(res, 404, { error: `unknown route: ${route}` });
      const id = `seo-jsonld-${slug(route)}-${Object.keys(model.pages[route].blocks || {}).length + 1}`;
      const json = escapeForScript(JSON.stringify(body.jsonLd));
      const block = { id, type: "html", html: `<script type="application/ld+json">${json}</script>` };
      const r = ctx.site.patch([{ op: "add", route, value: block }]);
      ctx.audit.log("add-schema", { route, blockId: id, by: actorOf(h), ok: r.ok });
      h.send(res, r.ok ? 200 : 400, { ...r, blockId: id });
    });

    // GET /health — liveness + version.
    ctx.routes.register("/health", async (req, res, h) => {
      h.send(res, 200, { ok: true, ext: "sophia-seo-suite", version: ctx.manifest?.version ?? null });
    });

    // --- Hooks: drive re-audits from content changes ---------------------
    const onChange = (evt) => {
      if (!ctx.settings.get("autoAuditOnChange")) return;
      // Core does not execute background jobs yet, so we self-signal: emit the
      // internal seo.audit.requested hook for any in-process listeners.
      try { ctx.hooks.emit && ctx.hooks.emit("seo.audit.requested", { reason: evt }); } catch (_e) { /* noop */ }
    };
    ctx.hooks.on("page.afterSave", () => onChange("page.afterSave"));
    ctx.hooks.on("site.afterPatch", () => onChange("site.afterPatch"));
    ctx.hooks.on("media.afterUpload", () => onChange("media.afterUpload"));

    ctx.audit.log("activated", { version: ctx.manifest?.version ?? null });
  },

  async deactivate(ctx) {
    ctx.logger.info("Sophia SEO Suite: deactivating");
  },
};

/* ===========================================================================
 * Audit engine (self-contained). Mirrors packages/core/src/audit/audit-core.ts.
 * ========================================================================= */

function auditModel(model) {
  const findings = [];
  const pages = model.pages || {};
  const siteSeo = model.seo || {};

  for (const [route, page] of Object.entries(pages)) {
    findings.push(...checkTitle(route, page));
    findings.push(...checkDescription(route, page));
    findings.push(...checkHeading(route, page));
    findings.push(...checkStructuredData(route, page));
  }
  if (!siteSeo.description) {
    findings.push(finding("meta.site-description.missing", "medium", "Site has no default meta description", { scope: "site" }, "Set a site-level default description."));
  }

  return { findings, score: scoreFindings(findings), pages: Object.keys(pages).length };
}

function checkTitle(route, page) {
  if (!page.title) {
    return [finding("meta.title.missing", "high", `"${route}" has no <title>`, pageTarget(route), "Add a descriptive page title (15–60 chars).")];
  }
  const len = page.title.length;
  if (len < TITLE_MIN || len > TITLE_MAX) {
    return [finding("meta.title.length", "medium", `"${route}" title length ${len} is outside ${TITLE_MIN}–${TITLE_MAX}`, pageTarget(route), `Adjust title to ${TITLE_MIN}–${TITLE_MAX} characters.`)];
  }
  return [];
}

function checkDescription(route, page) {
  const desc = (page.seo && page.seo.description) || "";
  if (!desc) {
    return [finding("meta.description.missing", "high", `"${route}" has no meta description`, pageTarget(route), "Add a meta description (50–160 chars).")];
  }
  const len = desc.length;
  if (len < DESC_MIN || len > DESC_MAX) {
    return [finding("meta.description.length", "low", `"${route}" description length ${len} is outside ${DESC_MIN}–${DESC_MAX}`, pageTarget(route), `Adjust description to ${DESC_MIN}–${DESC_MAX} characters.`)];
  }
  return [];
}

function checkHeading(route, page) {
  const blocks = page.blocks || [];
  // A `hero` headline renders as the page H1; raw html blocks may contain one.
  const hasH1 = blocks.some((b) => (b.type === "hero" && b.headline) || (b.type === "html" && /<h1[\s>]/i.test(b.html || "")));
  if (!hasH1) {
    return [finding("heading.h1.missing", "medium", `"${route}" has no clear H1 (hero headline)`, pageTarget(route), "Add a hero headline or an <h1> so the page has one clear primary heading.")];
  }
  return [];
}

function checkStructuredData(route, page) {
  const blocks = page.blocks || [];
  const hasJsonLd = blocks.some((b) => b.type === "html" && /application\/ld\+json/i.test(b.html || ""));
  if (!hasJsonLd) {
    return [finding("schema.jsonld.missing", "low", `"${route}" has no JSON-LD structured data`, pageTarget(route), "Add JSON-LD (e.g. Organization / WebPage / LocalBusiness) via POST /add-schema.")];
  }
  return [];
}

function scoreFindings(findings) {
  let penalty = 0;
  for (const f of findings) penalty += SEVERITY_PENALTY[f.severity] || 0;
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

function finding(code, severity, title, target, suggestion) {
  return { code, module: "audit-core", severity, title, target, suggestion };
}
function pageTarget(route) {
  return { scope: "page", pageId: route };
}

/* ===========================================================================
 * Helpers
 * ========================================================================= */

async function suggestTitle(ctx, route, page) {
  try {
    const keywords = ctx.settings.get("targetKeywords") || "";
    const out = await ctx.ai.generate({
      prompt:
        `Write one concise, specific, SEO-friendly <title> (max 60 chars) for the page at "${route}".` +
        (keywords ? ` Target keywords: ${keywords}.` : "") +
        ` Reply with ONLY the title text, no quotes.`,
      maxTokens: 30,
    });
    return ((out && out.text) || "").trim().slice(0, TITLE_MAX);
  } catch (_e) {
    return null;
  }
}

function actorOf(h) {
  if (h.user && h.user.email) return h.user.email;
  if (h.isAdmin) return "admin";
  return "token";
}

function safeJson(raw) {
  try { return JSON.parse(raw || "{}"); } catch (_e) { return {}; }
}

function slug(s) {
  return (s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()) || "root";
}

/** Prevent `</script>` breakout inside injected JSON-LD. */
function escapeForScript(json) {
  return json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}
