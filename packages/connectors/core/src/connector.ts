import type { Actor } from "@sophiaxt/seo-shared";
import type {
  ApplyOptions,
  Block,
  ChangeSet,
  ConnectorCapabilities,
  LlmsTxtUpdateInput,
  MetadataUpdateInput,
  Page,
  PageSummary,
  PublishResult,
  RollbackResult,
  SchemaAdditionInput,
  SiteSeoState,
  SiteStructure,
  SitemapUpdateInput,
  Version,
} from "./types.js";
import { NotApprovedError } from "./errors.js";

/**
 * The single interface every platform connector implements.
 *
 * Bands:
 *   READ  — no side effects.
 *   PLAN  — pure intent; returns a ChangeSet; NEVER writes to the site.
 *   APPLY — guarded by approval; reversible via Version/rollback.
 *
 * A module is only ever handed the READ band (see `ReadOnlySite`). Apply happens
 * from the approval flow, not from modules.
 */
export interface SiteConnector {
  readonly id: string;
  readonly platform: string;
  readonly capabilities: ConnectorCapabilities;

  /** Establish/verify the connection (auth, reachability). */
  connect(): Promise<void>;

  // --- READ band ---------------------------------------------------------
  getSite(): Promise<SiteStructure>;
  listPages(): Promise<PageSummary[]>;
  getPage(pageId: string): Promise<Page>;
  getBlocks(pageId: string): Promise<Block[]>;
  getSeoState(): Promise<SiteSeoState>;

  // --- PLAN band (returns ChangeSet, does NOT apply) ---------------------
  planMetadataUpdate(input: MetadataUpdateInput): Promise<ChangeSet>;
  planSchemaAddition(input: SchemaAdditionInput): Promise<ChangeSet>;
  planSitemapUpdate(input: SitemapUpdateInput): Promise<ChangeSet>;
  planLlmsTxtUpdate(input: LlmsTxtUpdateInput): Promise<ChangeSet>;

  // --- APPLY band (guarded + reversible) ---------------------------------
  applyChangeSet(set: ChangeSet, opts: ApplyOptions): Promise<Version>;
  publish(): Promise<PublishResult>;
  rollback(versionId: string): Promise<RollbackResult>;
  listVersions(): Promise<Version[]>;
}

/** The read-only projection a module receives. Apply is structurally absent. */
export type ReadOnlySite = Pick<
  SiteConnector,
  "getSite" | "listPages" | "getPage" | "getBlocks" | "getSeoState" | "capabilities"
>;

/** Narrow a full connector to its read band for safe hand-off to modules. */
export function readOnly(c: SiteConnector): ReadOnlySite {
  return {
    capabilities: c.capabilities,
    getSite: c.getSite.bind(c),
    listPages: c.listPages.bind(c),
    getPage: c.getPage.bind(c),
    getBlocks: c.getBlocks.bind(c),
    getSeoState: c.getSeoState.bind(c),
  };
}

/**
 * Shared apply guard. Connectors call this first inside `applyChangeSet` to
 * enforce the safety contract uniformly: no approver → throw, never write.
 */
export function assertApproved(set: ChangeSet, approvedBy: Actor | undefined): asserts approvedBy is Actor {
  if (!approvedBy || !approvedBy.userId) {
    throw new NotApprovedError(set.id);
  }
}

/** Default capabilities object — connectors override the true ones. */
export const NO_CAPABILITIES: ConnectorCapabilities = {
  supportsBlocks: false,
  supportsDrafts: false,
  supportsRollback: false,
  canEditMeta: false,
  canAddSchema: false,
  canEditSitemap: false,
  canEditLlmsTxt: false,
  versioning: "none",
};
