import type { Actor } from "@sophiaxt/seo-shared";

/* ----------------------------------------------------------------------------
 * Platform-agnostic site model.
 * A connector maps its native representation into these shapes on read, and maps
 * ChangeSets back into native operations on apply. Modules only ever see these.
 * -------------------------------------------------------------------------- */

export interface SiteStructure {
  /** Connector-scoped site id (not the suite's DB id). */
  siteId: string;
  name: string;
  baseUrl?: string;
  pages: PageSummary[];
  /** Current SEO defaults at the site level, if the platform exposes them. */
  seoDefaults?: SeoMeta;
}

export interface PageSummary {
  pageId: string; // e.g. route path "/" or "/about"
  title?: string;
  path: string;
}

export interface Page extends PageSummary {
  blocks: Block[];
  seo?: SeoMeta;
}

/** A platform block/component. `props` is opaque; modules read it read-only. */
export interface Block {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

/** Normalized SEO metadata the suite understands across platforms. */
export interface SeoMeta {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  openGraph?: Record<string, string>;
  twitter?: Record<string, string>;
  jsonLd?: JsonLd[];
}

export type JsonLd = Record<string, unknown>;

/** Resolved, per-page SEO state for auditing intended-vs-served. */
export interface SiteSeoState {
  site: SeoMeta;
  pages: Record<string, SeoMeta>; // keyed by pageId
}

/* ----------------------------------------------------------------------------
 * Capabilities — modules/UI degrade gracefully against these.
 * -------------------------------------------------------------------------- */

export interface ConnectorCapabilities {
  supportsBlocks: boolean;
  supportsDrafts: boolean;
  /** True server-side rollback (else the suite keeps its own before-snapshot). */
  supportsRollback: boolean;
  canEditMeta: boolean;
  canAddSchema: boolean;
  canEditSitemap: boolean;
  canEditLlmsTxt: boolean;
  /** none = no history; stack = pop-last (Sophia Stack today); addressable = by id. */
  versioning: "none" | "stack" | "addressable";
}

/* ----------------------------------------------------------------------------
 * ChangeSet — a described, previewable, NOT-yet-applied edit.
 * `ops` are connector-native and opaque to modules; `preview` is human-readable.
 * -------------------------------------------------------------------------- */

export interface ChangeSet {
  id: string;
  /** Which connector produced it (for routing apply). */
  connectorId: string;
  summary: string;
  /** Capability the apply path needs; checked before apply. */
  capabilityRequired: keyof ConnectorCapabilities | null;
  /** Native operations — opaque blob the producing connector understands. */
  ops: ConnectorOp[];
  preview: ChangePreview;
  /** When true, the target platform can't natively apply this; deliver as report. */
  reportOnly?: boolean;
}

/** Opaque to everyone except the connector that created and consumes it. */
export interface ConnectorOp {
  kind: string;
  [k: string]: unknown;
}

export interface ChangePreview {
  /** Human diff entries the owner reviews before approving. */
  changes: ChangePreviewEntry[];
}

export interface ChangePreviewEntry {
  target: string; // page path / block id / "site"
  field: string; // e.g. "meta.description"
  before?: string;
  after?: string;
  note?: string;
}

/* ----------------------------------------------------------------------------
 * Versions & results.
 * -------------------------------------------------------------------------- */

export interface Version {
  id: string;
  connectorId: string;
  createdAt: string; // ISO; stamped by caller, not inside deterministic code
  label?: string;
  appliedBy: Actor;
  changeSetId: string;
  /** Reference to a stored before-snapshot (suite DB), for revert + audit. */
  beforeSnapshotRef?: string;
}

export interface PublishResult {
  ok: boolean;
  versionId?: string;
  detail?: string;
}

export interface RollbackResult {
  ok: boolean;
  restoredVersionId?: string;
  remaining?: number;
  detail?: string;
}

/* ----------------------------------------------------------------------------
 * Plan inputs.
 * -------------------------------------------------------------------------- */

export interface MetadataUpdateInput {
  pageId: string;
  meta: Partial<SeoMeta>;
}

export interface SchemaAdditionInput {
  pageId: string;
  jsonLd: JsonLd;
}

export interface SitemapUpdateInput {
  /** Full proposed sitemap content, or structured entries. */
  entries?: { path: string; changefreq?: string; priority?: number }[];
  raw?: string;
}

export interface LlmsTxtUpdateInput {
  raw: string;
}

export interface ApplyOptions {
  approvedBy: Actor;
  /** Dedupe retries; connectors may forward to the platform when supported. */
  idempotencyKey?: string;
  /** Optional human label recorded on the resulting Version. */
  label?: string;
}
