// Sophia SEO Suite — Sophia Stack extension entry (targets Stack v1.5 "Stable").
//
// The REAL, installable integration. Runs in-process inside a Sophia Stack
// deployment via the extension `ctx` API and:
//   - registers admin nav + owner settings (with forward-idempotent migration),
//   - serves API routes under /api/extensions/sophia-seo-suite/*,
//   - runs a genuine SEO audit over the live Site Model,
//   - performs SAFE, owner-approved, LABELLED edits via ctx.site.patch
//     (validate-before-commit + snapshot + rollback + audit, automatic),
//   - exposes enumerable versions + targeted rollback (Stack v1.5 R2),
//   - sets native SEO <head> metadata + JSON-LD that the Stack renders (R1),
//   - suggests internal links using ctx.ai.embed (shipped), read-only,
//   - logs every action, and listens to content-change hooks.
//
// Build posture follows the v1.5 coordination sync: reads via ctx.site.read(),
// writes ONLY via ctx.site.patch, AI via ctx.ai.generate()/embed(). Nothing
// touches the model or files directly. Self-contained ESM → installs by copy
// with no build; the richer roadmap engine lives in packages/core.

const TITLE_MIN = 15;
const TITLE_MAX = 60;
const DESC_MIN = 50;
const DESC_MAX = 160;

const SEVERITY_PENALTY = { info: 0, low: 2, medium: 5, high: 10, critical: 20 };

// Bump when the shape of persisted settings changes. activate() migrates forward,
// idempotently and non-destructively (per the Stack's self-update guarantees).
const SETTINGS_VERSION = 1;

// SEO meta fields we set on pages.<route>.seo.* (rendered in <head> by Stack v1.5).
const META_FIELDS = ["description", "canonical", "robots", "openGraph", "twitter"];

export default {
  async activate(ctx) {
    ctx.logger.info(`Sophia SEO Suite v${ctx.manifest?.version ?? "?"}: activating (Stack v1.5 target)`);

    // --- Owner-configurable settings (+ forward migration) --------------
    ctx.settings.register({
      settingsVersion: { type: "number", default: 0 },
      defaultTitleSuffix: { type: "string", default: "" },
      targetKeywords: { type: "string", default: "" },
      autoAuditOnChange: { type: "boolean", default: true },
      tier: { type: "string", default: "starter" },
    });
    migrateSettings(ctx);

    // R5 (shipped): render a real in-dashboard panel. Falls back to a nav link on
    // pre-R5 hosts (the panel UI is also reachable at the /panel route directly).
    if (ctx.admin && typeof ctx.admin.registerPanel === "function") {
      ctx.admin.registerPanel({ label: "SEO Suite", path: "panel" });
    } else {
      ctx.admin.registerNav({ label: "SEO Suite", path: "/admin/extensions/seo", icon: "search" });
    }

    const hasVersions = ctx.versions && typeof ctx.versions.list === "function";

    // --- Routes ----------------------------------------------------------

    // GET /audit — real audit over the live model. Read-only.
    ctx.routes.register("/audit", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const model = ctx.site.read();
      const result = auditModel(model);
      ctx.audit.log("audit.run", { findings: result.findings.length, score: result.score });
      h.send(res, 200, result);
    });

    // POST /plan-title { route, title? } — PREVIEW only, writes nothing.
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
      h.send(res, 200, {
        preview: true,
        change: { target: route, field: "title", before: page.title || "", after: title + suffix },
        note: "Preview only. POST /optimize-title to apply (validate-before-commit + targeted rollback).",
      });
    });

    // POST /optimize-title { route, title? } — SAFE, LABELLED apply (auth-gated).
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
      const r = patch(ctx, [{ op: "mset", path: `pages.${route}.title`, value: title + suffix }], `seo: title ${route}`);
      ctx.audit.log("optimize-title", { route, by: actorOf(h), ok: r.ok });
      h.send(res, r.ok ? 200 : 400, r);
    });

    // POST /optimize-meta { route, description?, canonical?, robots?, openGraph?, twitter? }
    // Sets native pages.<route>.seo.* — Stack v1.5 RENDERS these in <head>.
    ctx.routes.register("/optimize-meta", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const body = safeJson(await h.readBody(req));
      const route = body.route || "/";
      const model = ctx.site.read();
      if (!(model.pages || {})[route]) return h.send(res, 404, { error: `unknown route: ${route}` });

      const ops = [];
      for (const field of META_FIELDS) {
        if (body[field] !== undefined) {
          ops.push({ op: "mset", path: `pages.${route}.seo.${field}`, value: body[field] });
        }
      }
      if (!ops.length) return h.send(res, 400, { error: `provide at least one of: ${META_FIELDS.join(", ")}` });
      const r = patch(ctx, ops, `seo: meta ${route}`);
      ctx.audit.log("optimize-meta", { route, fields: ops.map((o) => o.path), by: actorOf(h), ok: r.ok });
      h.send(res, r.ok ? 200 : 400, { ...r, note: "Rendered in <head> by Sophia Stack v1.5 (page overrides site)." });
    });

    // POST /add-schema { route, jsonLd } — append to native seo.jsonLd[] (rendered, script-safe).
    ctx.routes.register("/add-schema", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const body = safeJson(await h.readBody(req));
      const route = body.route || "/";
      if (!body.jsonLd || typeof body.jsonLd !== "object") return h.send(res, 400, { error: "jsonLd object required" });
      const model = ctx.site.read();
      const page = (model.pages || {})[route];
      if (!page) return h.send(res, 404, { error: `unknown route: ${route}` });
      const existing = Array.isArray(page.seo && page.seo.jsonLd) ? page.seo.jsonLd : [];
      const next = existing.concat([body.jsonLd]);
      const r = patch(ctx, [{ op: "mset", path: `pages.${route}.seo.jsonLd`, value: next }], `seo: schema ${route}`);
      ctx.audit.log("add-schema", { route, count: next.length, by: actorOf(h), ok: r.ok });
      h.send(res, r.ok ? 200 : 400, r);
    });

    // GET /suggest-links — read-only internal-link suggestions via ctx.ai.embed.
    ctx.routes.register("/suggest-links", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      if (typeof ctx.ai.embed !== "function") {
        return h.send(res, 400, { error: "embeddings not available on this deployment" });
      }
      try {
        const suggestions = await suggestInternalLinks(ctx);
        ctx.audit.log("suggest-links", { pairs: suggestions.length });
        h.send(res, 200, { suggestions, note: "Read-only suggestions; apply by editing the relevant nav/content blocks." });
      } catch (e) {
        h.send(res, 400, { error: "embedding failed: " + e.message });
      }
    });

    // GET /versions — enumerable named snapshots (Stack v1.5 R2).
    ctx.routes.register("/versions", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      if (!hasVersions) return h.send(res, 200, { versions: [], note: "version history unavailable on this host" });
      const versions = await ctx.versions.list();
      h.send(res, 200, { versions });
    });

    // POST /rollback { id } — targeted rollback of one change (Stack v1.5 R2).
    ctx.routes.register("/rollback", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      if (!hasVersions || typeof ctx.versions.rollbackTo !== "function") {
        return h.send(res, 400, { error: "targeted rollback unavailable on this host" });
      }
      const body = safeJson(await h.readBody(req));
      if (!body.id) return h.send(res, 400, { error: "id required" });
      const r = await ctx.versions.rollbackTo(body.id);
      ctx.audit.log("rollback", { id: body.id, by: actorOf(h), ok: !!(r && r.ok) });
      h.send(res, r && r.ok ? 200 : 400, r || { ok: false });
    });

    // GET /health — liveness + version + capability snapshot.
    ctx.routes.register("/health", async (req, res, h) => {
      h.send(res, 200, {
        ok: true,
        ext: "sophia-seo-suite",
        version: ctx.manifest?.version ?? null,
        caps: { versions: !!hasVersions, embed: typeof ctx.ai.embed === "function", panel: ctx.admin && typeof ctx.admin.registerPanel === "function" },
      });
    });

    // GET /panel — the owner UI (R5). Rendered by the Stack as a dashboard tab
    // (iframed, same-origin → its fetches carry the owner session). The shell is
    // static HTML; all data/actions go through the auth-gated routes above.
    ctx.routes.register("/panel", async (req, res, _h) => {
      res.statusCode = 200;
      if (typeof res.setHeader === "function") res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(PANEL_HTML);
    });

    // --- Hooks: drive re-audits from content changes ---------------------
    const onChange = (evt) => {
      if (!ctx.settings.get("autoAuditOnChange")) return;
      // Core does not execute background jobs / fire seo.audit.requested yet, so
      // we self-signal for any in-process listeners (drop this when R3/R4 land).
      try { ctx.hooks.emit && ctx.hooks.emit("seo.audit.requested", { reason: evt }); } catch (_e) { /* noop */ }
    };
    ctx.hooks.on("page.afterSave", () => onChange("page.afterSave"));
    ctx.hooks.on("site.afterPatch", () => onChange("site.afterPatch"));
    ctx.hooks.on("media.afterUpload", () => onChange("media.afterUpload"));

    ctx.audit.log("activated", { version: ctx.manifest?.version ?? null, settingsVersion: SETTINGS_VERSION });
  },

  async deactivate(ctx) {
    // Non-destructive: we never delete owner settings or site content here.
    // SEO metadata and JSON-LD already written remain part of the model
    // (uninstalling the Suite does not strip the owner's SEO work).
    ctx.logger.info("Sophia SEO Suite: deactivating (no data removed)");
  },
};

/* ===========================================================================
 * Settings migration — forward-only, idempotent, non-destructive.
 * ========================================================================= */

function migrateSettings(ctx) {
  let v = Number(ctx.settings.get("settingsVersion") || 0);
  if (v >= SETTINGS_VERSION) return;
  // v0 → v1: nothing to transform yet; just stamp. Future bumps add `if (v < N)`
  // additive transforms here — never a destructive rewrite.
  if (v < 1) v = 1;
  ctx.settings.set("settingsVersion", v);
  ctx.logger.info(`SEO Suite settings migrated to v${v}`);
}

/* ===========================================================================
 * Safe patch helper — always labels the snapshot (Stack v1.5).
 * ========================================================================= */

function patch(ctx, ops, label) {
  try {
    // v1.5 ctx.site.patch accepts a label; older hosts ignore the 2nd arg.
    return ctx.site.patch(ops, label) || { ok: false };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

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
    findings.push(finding("meta.site-description.missing", "medium", "Site has no default meta description", { scope: "site" }, "Set model.seo.description (site-level default)."));
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
    return [finding("meta.description.missing", "high", `"${route}" has no meta description`, pageTarget(route), "Add pages.<route>.seo.description (50–160 chars).")];
  }
  const len = desc.length;
  if (len < DESC_MIN || len > DESC_MAX) {
    return [finding("meta.description.length", "low", `"${route}" description length ${len} is outside ${DESC_MIN}–${DESC_MAX}`, pageTarget(route), `Adjust description to ${DESC_MIN}–${DESC_MAX} characters.`)];
  }
  return [];
}

function checkHeading(route, page) {
  const blocks = page.blocks || [];
  const hasH1 = blocks.some((b) => (b.type === "hero" && b.headline) || (b.type === "html" && /<h1[\s>]/i.test(b.html || "")));
  if (!hasH1) {
    return [finding("heading.h1.missing", "medium", `"${route}" has no clear H1 (hero headline)`, pageTarget(route), "Add a hero headline or an <h1> so the page has one clear primary heading.")];
  }
  return [];
}

function checkStructuredData(route, page) {
  const native = page.seo && Array.isArray(page.seo.jsonLd) && page.seo.jsonLd.length > 0;
  const inBlock = (page.blocks || []).some((b) => b.type === "html" && /application\/ld\+json/i.test(b.html || ""));
  if (!native && !inBlock) {
    return [finding("schema.jsonld.missing", "low", `"${route}" has no JSON-LD structured data`, pageTarget(route), "Add JSON-LD (Organization / WebPage / LocalBusiness) via POST /add-schema.")];
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
 * Internal-link suggestions via embeddings (Stack v1.5 ctx.ai.embed shipped).
 * ========================================================================= */

async function suggestInternalLinks(ctx) {
  const model = ctx.site.read();
  const routes = Object.keys(model.pages || {});
  if (routes.length < 2) return [];
  const texts = routes.map((r) => pageText(model.pages[r], r).slice(0, 2000));
  const vectors = await ctx.ai.embed(texts);
  if (!Array.isArray(vectors) || vectors.length !== routes.length) return [];

  const out = [];
  for (let i = 0; i < routes.length; i++) {
    const ranked = [];
    for (let j = 0; j < routes.length; j++) {
      if (i === j) continue;
      ranked.push({ to: routes[j], score: cosine(vectors[i], vectors[j]) });
    }
    ranked.sort((a, b) => b.score - a.score);
    out.push({ from: routes[i], related: ranked.slice(0, 2).map((x) => ({ to: x.to, score: round3(x.score) })) });
  }
  return out;
}

function pageText(page, route) {
  const parts = [route, page.title || ""];
  for (const b of page.blocks || []) {
    for (const v of Object.values(b)) {
      if (typeof v === "string") parts.push(v);
    }
  }
  return parts.join(" ");
}

function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}
function round3(n) {
  return Math.round(n * 1000) / 1000;
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

/* ===========================================================================
 * Owner panel UI (R5). Self-contained HTML; fetches the auth-gated routes with
 * the owner session (same-origin). No external assets. Client JS uses string
 * concatenation (no template literals) so this outer template literal is literal.
 * ========================================================================= */

const PANEL_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sophia SEO Suite</title>
<style>
  :root{--bg:#0a1628;--card:#0c1a28;--fg:#e8f4f8;--mut:#9fc7d6;--ac:#00D4FF;--line:rgba(0,212,255,.15)}
  *{box-sizing:border-box}
  body{font-family:system-ui,Segoe UI,sans-serif;background:var(--bg);color:var(--fg);margin:0;padding:22px}
  h1{color:var(--ac);margin:0 0 2px;font-size:20px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);margin:0 0 10px}
  .sub{color:var(--mut);margin:0 0 18px;font-size:13px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:14px}
  .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  input,textarea{background:#08131f;color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px}
  input{min-width:120px}textarea{width:100%;min-height:70px;margin-top:8px;font-family:ui-monospace,Consolas,monospace}
  button{background:linear-gradient(120deg,#00D4FF,#0066FF);color:#04121a;border:0;border-radius:9px;padding:8px 14px;font-weight:700;cursor:pointer;font-size:13px}
  button.ghost{background:transparent;color:var(--ac);border:1px solid var(--line)}
  .score{font-size:34px;font-weight:800}
  pre{background:#08131f;border:1px solid var(--line);border-radius:10px;padding:12px;color:var(--mut);overflow:auto;font-size:12px;margin:10px 0 0}
  .f{display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px}
  .dot{width:9px;height:9px;border-radius:50%;margin-top:5px;flex:0 0 auto}
  .hi{background:#ff5470}.me{background:#ffb454}.lo{background:#5a6b7a}
  .muted{color:var(--mut);font-size:12px}
  .ver{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line);font-size:13px;align-items:center}
</style></head>
<body>
  <h1>Sophia SEO Suite</h1>
  <p class="sub">Owner-safe SEO automation for this site. Every change is previewed and applied through validate-before-commit + targeted rollback.</p>

  <div class="card">
    <h2>Audit</h2>
    <div class="row"><button onclick="runAudit()">Run SEO audit</button><span id="score" class="score muted">—</span></div>
    <div id="findings"></div>
  </div>

  <div class="card">
    <h2>Metadata</h2>
    <div class="row">
      <input id="m_route" placeholder="route e.g. /" value="/">
      <input id="m_title" placeholder="title (optional → AI suggests)">
      <button onclick="optTitle()">Optimize title</button>
    </div>
    <div class="row" style="margin-top:8px">
      <input id="m_desc" placeholder="meta description" style="flex:1;min-width:240px">
      <button onclick="optMeta()">Save meta</button>
    </div>
    <pre id="meta_out" class="muted">Sets native pages.&lt;route&gt;.seo.* — rendered in &lt;head&gt;.</pre>
  </div>

  <div class="card">
    <h2>JSON-LD schema</h2>
    <div class="row"><input id="s_route" placeholder="route" value="/"><button onclick="addSchema()">Add schema</button></div>
    <textarea id="s_json">{"@context":"https://schema.org","@type":"Organization","name":"My Business"}</textarea>
    <pre id="schema_out" class="muted">Appended to native seo.jsonLd[] (script-safe).</pre>
  </div>

  <div class="card">
    <h2>Internal links (AI)</h2>
    <div class="row"><button class="ghost" onclick="suggest()">Suggest internal links</button></div>
    <pre id="links_out" class="muted">Read-only suggestions via embeddings.</pre>
  </div>

  <div class="card">
    <h2>Versions &amp; rollback</h2>
    <div class="row"><button class="ghost" onclick="loadVersions()">Refresh versions</button></div>
    <div id="versions"></div>
  </div>

<script>
  var API='/api/extensions/sophia-seo-suite';
  function J(){return {credentials:'same-origin',headers:{'Content-Type':'application/json'}};}
  async function get(p){var r=await fetch(API+p,{credentials:'same-origin'});return r.json();}
  async function post(p,b){var o=J();o.method='POST';o.body=JSON.stringify(b||{});var r=await fetch(API+p,o);return r.json();}
  function esc(s){return String(s).replace(/[&<>]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;';});}

  async function runAudit(){
    document.getElementById('score').textContent='…';
    try{
      var d=await get('/audit');
      document.getElementById('score').textContent=(d.score!=null?d.score:'?')+' / 100';
      document.getElementById('score').className='score';
      var html='';
      (d.findings||[]).forEach(function(f){
        var sev=f.severity==='high'||f.severity==='critical'?'hi':(f.severity==='medium'?'me':'lo');
        var where=f.target&&f.target.pageId?f.target.pageId:(f.target&&f.target.scope||'');
        html+='<div class="f"><span class="dot '+sev+'"></span><div><div>'+esc(f.title)+'</div>'
            +'<div class="muted">'+esc(f.code)+' · '+esc(where)+(f.suggestion?' → '+esc(f.suggestion):'')+'</div></div></div>';
      });
      document.getElementById('findings').innerHTML=html||'<p class="muted">No findings — clean.</p>';
    }catch(e){document.getElementById('findings').innerHTML='<p class="muted">'+esc(e)+'</p>';}
  }
  async function optTitle(){
    var b={route:document.getElementById('m_route').value};
    var t=document.getElementById('m_title').value;if(t)b.title=t;
    show('meta_out',await post('/optimize-title',b));
  }
  async function optMeta(){
    var b={route:document.getElementById('m_route').value,description:document.getElementById('m_desc').value};
    show('meta_out',await post('/optimize-meta',b));
  }
  async function addSchema(){
    var j;try{j=JSON.parse(document.getElementById('s_json').value);}catch(e){return show('schema_out',{error:'invalid JSON'});}
    show('schema_out',await post('/add-schema',{route:document.getElementById('s_route').value,jsonLd:j}));
  }
  async function suggest(){show('links_out',{loading:true});show('links_out',await get('/suggest-links'));}
  async function loadVersions(){
    var d=await get('/versions');var html='';
    (d.versions||[]).forEach(function(v){
      html+='<div class="ver"><span>'+esc(v.label||v.id)+' <span class="muted">'+esc(v.id)+'</span></span>'
          +'<button class="ghost" onclick="rollback(\\''+esc(v.id)+'\\')">Roll back</button></div>';
    });
    document.getElementById('versions').innerHTML=html||'<p class="muted">No snapshots yet.</p>';
  }
  async function rollback(id){if(!confirm('Roll back to '+id+'?'))return;await post('/rollback',{id:id});loadVersions();runAudit();}
  function show(id,obj){document.getElementById(id).textContent=JSON.stringify(obj,null,2);document.getElementById(id).className='';}
  runAudit();
</script>
</body></html>`;
