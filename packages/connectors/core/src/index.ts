/**
 * @sophiaxt/seo-connector-core — THE CONTRACT.
 *
 * Every site platform (Sophia Stack, WordPress, Wix, …) is reached only through
 * the `SiteConnector` interface defined here. Modules and the dashboard branch on
 * `capabilities`, never on connector identity. The interface is shaped around
 * SAFE SEO operations (read → plan → apply → rollback), not generic CRUD — there
 * is deliberately no "delete page" / "overwrite content" verb.
 */
export * from "./types.js";
export * from "./connector.js";
export * from "./errors.js";
export * from "./stub.js";
