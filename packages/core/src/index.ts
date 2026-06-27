/**
 * @sophiaxt/seo-core — the SEO engine.
 *
 * Modules are (mostly) pure: given a READ-ONLY view of a site, they produce
 * findings and previewable ChangeSets. They never open a socket to a site — all
 * site I/O is the connector's job. This keeps modules testable and keeps the
 * safe-editing contract in one place.
 */
export * from "./module.js";
export * from "./registry.js";
export * from "./audit/index.js";
export * from "./seo/index.js";
