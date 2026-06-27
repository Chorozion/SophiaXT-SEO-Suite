// Sophia SEO Suite — admin UI entry.
//
// `adminEntry` in the manifest points here. Mounting extension admin panels
// inside the Sophia Stack dashboard is a PLANNED Stack integration point (the
// dashboard surfaces our `adminNav` item but does not yet import/mount this
// module). Until panel-mount ships, the Suite's owner UI is served from its own
// routes under /api/extensions/sophia-seo-suite/* and this file stays
// documentation-only.
//
// When panel mounting lands, this default export renders the owner dashboard
// (audit view, metadata editor, schema tools), reading/writing exclusively
// through the extension routes (never the model directly).
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
