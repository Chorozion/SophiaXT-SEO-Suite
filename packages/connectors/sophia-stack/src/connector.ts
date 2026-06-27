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
 * Capabilities as Sophia Stack stands at v1.5 (see read-only analysis + the
 * coordination sync):
 *   - page title AND full SEO meta (description/canonical/robots/openGraph/twitter/
 *     jsonLd) are natively settable via `pages.<route>.seo.*` / `model.seo.*` and
 *     RENDERED in <head> (R1 shipped) — page overrides site, all escaped
 *   - JSON-LD can also be added via an `html` block (additive, non-destructive)
 *   - versions are enumerable and rollback is TARGETED by id (R2 shipped)
 *   - sitemap/llms.txt remain auto-derived (configurable variants still planned)
 */
const SOPHIA_STACK_CAPS: ConnectorCapabilities = {
  supportsBlocks: true,
  supportsDrafts: false, // Sophia Stack has no draft state; suite holds drafts in its DB
  supportsRollback: true, // R2: targeted rollback by snapshot id
  canEditMeta: true, // R1: full meta rendered in <head>
  canAddSchema: true, // native jsonLd[] + html-block fallback
  canEditSitemap: false, // sitemap auto-derived; config still planned
  canEditLlmsTxt: false, // llms.txt auto-derived; config still planned
  versioning: "addressable", // R2: named, enumerable snapshots
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
    // description/canonical/robots/openGraph/twitter: native `pages.<route>.seo.*`
    // paths that Sophia Stack v1.5 RENDERS in <head> (R1 shipped). Page values
    // override site-level `model.seo.*`.
    const richKeys: (keyof SeoMeta)[] = ["description", "canonical", "robots", "openGraph", "twitter"];
    for (const key of richKeys) {
      const val = input.meta[key];
      if (val !== undefined) {
        ops.push({ op: "mset", path: `pages.${input.pageId}.seo.${key}`, value: val as unknown });
        previewChanges.push({
          target: input.pageId,
          field: `seo.${String(key)}`,
          after: typeof val === "string" ? val : JSON.stringify(val),
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
    // Stack v1.5: append to the native `pages.<route>.seo.jsonLd[]` array, which
    // the Stack renders as a script-safe <script type="application/ld+json">.
    // Additive — existing entries are preserved.
    const page = await this.getPage(input.pageId);
    const existing = page.seo?.jsonLd ?? [];
    const next = [...existing, input.jsonLd];
    const op: SophiaPatchOp = { op: "mset", path: `pages.${input.pageId}.seo.jsonLd`, value: next };
    return this.changeSet({
      summary: `Add JSON-LD schema to ${input.pageId}`,
      capabilityRequired: "canAddSchema",
      ops: [op],
      previewChanges: [
        { target: input.pageId, field: "seo.jsonLd", after: JSON.stringify(input.jsonLd), note: "Appended to native seo.jsonLd[] (rendered in <head>)." },
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

  async rollback(versionId: string): Promise<RollbackResult> {
    // Stack v1.5: targeted rollback by snapshot id (reverts one change; the host
    // snapshots current first so the revert is itself reversible).
    const r = await this.transport.rollback(versionId);
    return {
      ok: r.ok,
      restoredVersionId: r.restored ? versionId : undefined,
      remaining: r.remaining,
      detail: r.restored ? `Reverted to ${versionId}.` : "Nothing to roll back.",
    };
  }

  async listVersions(): Promise<Version[]> {
    // Stack v1.5: enumerable named snapshots.
    const { versions } = await this.transport.versions();
    return (versions ?? []).map((v) => ({
      id: v.id,
      connectorId: this.id,
      createdAt: typeof v.ts === "number" ? new Date(v.ts).toISOString() : "",
      label: v.label,
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

