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
import type { SiteConnector } from "./connector.js";
import { NO_CAPABILITIES } from "./connector.js";
import { NotImplementedError } from "./errors.js";

/**
 * Base for connectors that are declared but not yet built. Every method throws
 * `NotImplementedError(platform, method)` so the architecture can reference the
 * platform while making it unmistakably clear nothing is wired. Subclasses set
 * `platform` and override methods as they're implemented.
 */
export abstract class StubConnector implements SiteConnector {
  abstract readonly id: string;
  abstract readonly platform: string;
  readonly capabilities: ConnectorCapabilities = NO_CAPABILITIES;

  private nope(method: string): never {
    throw new NotImplementedError(this.platform, method);
  }

  async connect(): Promise<void> {
    this.nope("connect");
  }
  async getSite(): Promise<SiteStructure> {
    this.nope("getSite");
  }
  async listPages(): Promise<PageSummary[]> {
    this.nope("listPages");
  }
  async getPage(_pageId: string): Promise<Page> {
    this.nope("getPage");
  }
  async getBlocks(_pageId: string): Promise<Block[]> {
    this.nope("getBlocks");
  }
  async getSeoState(): Promise<SiteSeoState> {
    this.nope("getSeoState");
  }
  async planMetadataUpdate(_input: MetadataUpdateInput): Promise<ChangeSet> {
    this.nope("planMetadataUpdate");
  }
  async planSchemaAddition(_input: SchemaAdditionInput): Promise<ChangeSet> {
    this.nope("planSchemaAddition");
  }
  async planSitemapUpdate(_input: SitemapUpdateInput): Promise<ChangeSet> {
    this.nope("planSitemapUpdate");
  }
  async planLlmsTxtUpdate(_input: LlmsTxtUpdateInput): Promise<ChangeSet> {
    this.nope("planLlmsTxtUpdate");
  }
  async applyChangeSet(_set: ChangeSet, _opts: ApplyOptions): Promise<Version> {
    this.nope("applyChangeSet");
  }
  async publish(): Promise<PublishResult> {
    this.nope("publish");
  }
  async rollback(_versionId: string): Promise<RollbackResult> {
    this.nope("rollback");
  }
  async listVersions(): Promise<Version[]> {
    this.nope("listVersions");
  }
}
