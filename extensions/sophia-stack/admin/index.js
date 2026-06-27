// Sophia SEO Suite — admin UI entry (legacy/optional).
//
// As of Stack v1.5, the live owner UI is rendered via `ctx.admin.registerPanel`
// + the `/panel` route (see extension.js `PANEL_HTML`) — the Stack iframes that
// same-origin as a dashboard tab. This `adminEntry` module is retained only as a
// fallback descriptor for hosts that import it; it is not the primary path.
export default {
  title: "SEO Suite",
  render() {
    return [
      "<section>",
      "  <h2>Sophia SEO Suite</h2>",
      "  <p>Owner-safe SEO automation. Every change is previewed and applied through",
      "     validate-before-commit + rollback.</p>",
      "  <ul>",
      "    <li>GET  /api/extensions/sophia-seo-suite/audit — run an SEO audit</li>",
      "    <li>POST /api/extensions/sophia-seo-suite/plan-title — preview a title change</li>",
      "    <li>POST /api/extensions/sophia-seo-suite/optimize-title — apply (approved)</li>",
      "    <li>POST /api/extensions/sophia-seo-suite/optimize-meta — set a meta description</li>",
      "    <li>POST /api/extensions/sophia-seo-suite/add-schema — add JSON-LD</li>",
      "  </ul>",
      "</section>",
    ].join("\n");
  },
};
