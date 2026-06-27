import {
  assertApproved,
  type ApplyOptions,
  type Block,
  type ChangeSet,
  type ConnectorCapabilities,
  type ConnectorOp,
  type LlmsTxtUpdateInput,
  type MetadataUpdateInput,
  type Page,
  type PageSummary,
  type PublishResult,
  type RollbackResult,
  type SchemaAdditionInput,
  type SiteConnector,
  type SiteSeoState,
  type SiteStructure,
  type SitemapUpdateInput,
  type Version,
  type SeoMeta,
  CapabilityError,
} from "@sophiaxt/seo-connector-core";
import type { SophiaModel, SophiaPatchOp } from "./model.js";
import type { SophiaStackTransport } from "./transport/transport.js";
import { MockTransport } from "./transport/mock.js";

/**
 * Capabilities as Sophia Stack stands TODAY (see read-only analysis):
 *   - titles are natively editable (page title path)
 *   - full meta/canonical/OG are NOT native yet → meta edits are partial; we set
 *     what we can (title) and stage the rest as an html-block payload / report
 *   - JSON-LD can be added via an `html` block (additive, non-destructive)
 *   - rollback is "stack" style (pop last); versioning list is count-only
 */
const SOPHIA_STACK_CAPS: ConnectorCapabilities = {
  supportsBlocks: true,
  supportsDrafts: false, // Sophia Stack has no draft state; suite holds drafts in its DB
  supportsRollback: true,
  canEditMeta: true, // titles native; richer meta pending extension R1
  canAddSchema: true, // via html block today
  canEditSitemap: false, // sitemap is auto-derived; config pending extension R2
  canEditLlmsTxt: false, // llms.txt is auto-derived; config pending extension R2
  versioning: "stack",
};

export interface SophiaStackConnectorOptions {
  id: string;
  transport?: SophiaStackTransport;
  /**
   * Override capabilities for a specific transport. The in-extension `ctx`
   * transport, for example, cannot trigger rollback or read version history, so
   * the extension passes `{ supportsRollback: false, versioning: "none" }`.
   */
  capabilities?: Partial<ConnectorCapabilities>;
}

export class SophiaStackConnector implements SiteConnector {
  readonly id: string;
  readonly platform = "sophia-stack";
  readonly capabilities: ConnectorCapabilities;
  private readonly transport: SophiaStackTransport;
  /** Monotonic local counter for changeset/version ids (deterministic-friendly). */
  private seq = 0;

  constructor(opts: SophiaStackConnectorOptions) {
    this.id = opts.id;
    this.transport = opts.transport ?? new MockTransport();
    this.capabilities = { ...SOPHIA_STACK_CAPS, ...opts.capabilities };
  }

  async connect(): Promise<void> {
    const p = await this.transport.ping();
    if (!p.ok) throw new Error(`[${this.id}] Sophia Stack ping failed`);
  }

  // --- READ band ---------------------------------------------------------

  async getSite(): Promise<SiteStructure> {
    const model = await this.transport.getModel();
    return {
      siteId: this.id,
      name: model.site,
      pages: this.pageSummaries(model),
      seoDefaults: readSiteSeo(model),
    };
  }

  async listPages(): Promise<PageSummary[]> {
    return this.pageSummaries(await this.transport.getModel());
  }

  async getPage(pageId: string): Promise<Page> {
    const model = await this.transport.getModel();
    const page = model.pages[pageId];
    if (!page) throw new Error(`[${this.id}] page not found: ${pageId}`);
    return {
      pageId,
      path: pageId,
      title: page.title,
      blocks: (page.blocks ?? []).map(toBlock),
      seo: readPageSeo(page),
    };
  }

  async getBlocks(pageId: string): Promise<Block[]> {
    return (await this.getPage(pageId)).blocks;
  }

  async getSeoState(): Promise<SiteSeoState> {
    const model = await this.transport.getModel();
    const pages: Record<string, SeoMeta> = {};
    for (const [route, page] of Object.entries(model.pages)) {
      pages[route] = readPageSeo(page);
    }
    return { site: readSiteSeo(model), pages };
  }

  // --- PLAN band (returns ChangeSet, never writes) -----------------------

  async planMetadataUpdate(input: MetadataUpdateInput): Promise<ChangeSet> {
    const current = await this.getPage(input.pageId);
    const ops: SophiaPatchOp[] = [];
    const previewChanges = [];

    // Title is natively settable.
    if (input.meta.title !== undefined) {
      ops.push({ op: "mset", path: `pages.${input.pageId}.title`, value: input.meta.title });
      previewChanges.push({
        target: input.pageId,
        field: "title",
        before: current.title,
        after: input.meta.title,
      });
    }

    // description/canonical/og: native after extension R1. Today we stage them on
    // the model's (non-rendered) `seo` path so nothing is lost, and mark the
    // changeset reportOnly for the parts the live renderer won't surface yet.
    // description/canonical/og: these are valid model paths, so the patch DOES
    // apply (nothing is lost). The live renderer just won't surface them in
    // <head> until Sophia Stack extension R1 lands — noted in the preview.
    const richKeys: (keyof SeoMeta)[] = ["description", "canonical", "robots", "openGraph", "twitter"];
    for (const key of richKeys) {
      const val = input.meta[key];
      if (val !== undefined) {
        ops.push({ op: "mset", path: `pages.${input.pageId}.seo.${key}`, value: val as unknown });
        previewChanges.push({
          target: input.pageId,
          field: `seo.${String(key)}`,
          after: typeof val === "string" ? val : JSON.stringify(val),
          note: "Stored on model.seo; rendered in <head> once Sophia Stack extension R1 lands.",
        });
      }
    }

    return this.changeSet({
      summary: `Update SEO metadata for ${input.pageId}`,
      capabilityRequired: "canEditMeta",
      ops,
      previewChanges,
    });
  }

  async planSchemaAddition(input: SchemaAdditionInput): Promise<ChangeSet> {
    // Additive: inject JSON-LD via an `html` block (non-destructive escape hatch).
    const blockId = `seo-jsonld-${slug(input.pageId)}-${++this.seq}`;
    const json = JSON.stringify(input.jsonLd);
    const op: SophiaPatchOp = {
      op: "add",
      route: input.pageId,
      value: {
        id: blockId,
        type: "html",
        html: `<script type="application/ld+json">${escapeForHtml(json)}</script>`,
      },
    };
    return this.changeSet({
      summary: `Add JSON-LD schema to ${input.pageId}`,
      capabilityRequired: "canAddSchema",
      ops: [op],
      previewChanges: [
        { target: input.pageId, field: "jsonLd", after: json, note: `Adds html block ${blockId}.` },
      ],
    });
  }

  async planSitemapUpdate(_input: SitemapUpdateInput): Promise<ChangeSet> {
    // Sitemap is auto-derived from pages today; not directly editable.
    return this.changeSet({
      summary: "Sitemap is auto-generated by Sophia Stack",
      capabilityRequired: "canEditSitemap",
      ops: [],
      previewChanges: [
        { target: "site", field: "sitemap.xml", note: "Report-only until Sophia Stack extension R2 (configurable sitemap)." },
      ],
      reportOnly: true,
    });
  }

  async planLlmsTxtUpdate(input: LlmsTxtUpdateInput): Promise<ChangeSet> {
    return this.changeSet({
      summary: "llms.txt is auto-generated by Sophia Stack",
      capabilityRequired: "canEditLlmsTxt",
      ops: [],
      previewChanges: [
        { target: "site", field: "llms.txt", after: input.raw, note: "Report-only until Sophia Stack extension R2." },
      ],
      reportOnly: true,
    });
  }

  // --- APPLY band (guarded + reversible) ---------------------------------

  async applyChangeSet(set: ChangeSet, opts: ApplyOptions): Promise<Version> {
    assertApproved(set, opts.approvedBy); // SAFETY GATE: throws if unapproved

    if (set.reportOnly) {
      throw new CapabilityError(this.id, set.capabilityRequired ?? "apply");
    }
    const ops = set.ops as unknown as SophiaPatchOp[];
    if (ops.length > 0) {
      await this.transport.patch(ops, { label: opts.label ?? set.summary });
    }
    return {
      id: `ver-${this.id}-${++this.seq}`,
      connectorId: this.id,
      createdAt: "", // ISO timestamp stamped by the caller (kept out of core for determinism)
      label: opts.label ?? set.summary,
      appliedBy: opts.approvedBy,
      changeSetId: set.id,
    };
  }

  async publish(): Promise<PublishResult> {
    // Sophia Stack patches are live-applied; "publish" is a no-op acknowledgement
    // here. A real deploy would invoke the non-destructive deployer flow.
    return { ok: true, detail: "Sophia Stack applies patches live; no separate publish step." };
  }

  async rollback(_versionId: string): Promise<RollbackResult> {
    // Today: stack-style pop of the last snapshot. Targeted rollback by version
    // arrives with extension R4; until then we honor "undo last".
    const r = await this.transport.rollback();
    return { ok: r.ok, remaining: r.remaining, detail: r.restored ? "Reverted last change." : "Nothing to roll back." };
  }

  async listVersions(): Promise<Version[]> {
    // Count-only today (extension R4 adds a real list). Represent as N opaque refs.
    const { count } = await this.transport.versions();
    return Array.from({ length: count }, (_v, i) => ({
      id: `snap-${i}`,
      connectorId: this.id,
      createdAt: "",
      changeSetId: "",
      appliedBy: { userId: "unknown", role: "developer" as const },
    }));
  }

  // --- helpers -----------------------------------------------------------

  private pageSummaries(model: SophiaModel): PageSummary[] {
    return Object.entries(model.pages).map(([path, page]) => ({
      pageId: path,
      path,
      title: page.title,
    }));
  }

  private changeSet(args: {
    summary: string;
    capabilityRequired: ChangeSet["capabilityRequired"];
    ops: SophiaPatchOp[];
    previewChanges: ChangeSet["preview"]["changes"];
    reportOnly?: boolean;
  }): ChangeSet {
    return {
      id: `cs-${this.id}-${++this.seq}`,
      connectorId: this.id,
      summary: args.summary,
      capabilityRequired: args.capabilityRequired,
      ops: args.ops as unknown as ConnectorOp[],
      preview: { changes: args.previewChanges },
      reportOnly: args.reportOnly,
    };
  }
}

/* --- model → normalized mapping ------------------------------------------- */

function toBlock(b: { id: string; type: string; [k: string]: unknown }): Block {
  const { id, type, ...props } = b;
  return { id, type, props };
}

function readSiteSeo(model: SophiaModel): SeoMeta {
  const seo = (model.seo ?? {}) as Record<string, unknown>;
  return normalizeSeo(seo);
}

function readPageSeo(page: { title?: string; seo?: Record<string, unknown> }): SeoMeta {
  const seo = normalizeSeo((page.seo ?? {}) as Record<string, unknown>);
  if (page.title && !seo.title) seo.title = page.title;
  return seo;
}

function normalizeSeo(seo: Record<string, unknown>): SeoMeta {
  return {
    title: typeof seo.title === "string" ? seo.title : undefined,
    description: typeof seo.description === "string" ? seo.description : undefined,
    canonical: typeof seo.canonical === "string" ? seo.canonical : undefined,
    robots: typeof seo.robots === "string" ? seo.robots : undefined,
    openGraph: (seo.openGraph as Record<string, string>) ?? undefined,
    twitter: (seo.twitter as Record<string, string>) ?? undefined,
    jsonLd: Array.isArray(seo.jsonLd) ? (seo.jsonLd as Record<string, unknown>[]) : undefined,
  };
}

function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "root";
}

/** Prevent `</script>` breakout inside the injected JSON-LD block. */
function escapeForHtml(json: string): string {
  return json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}
