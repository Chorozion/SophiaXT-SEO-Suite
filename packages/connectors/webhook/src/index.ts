/**
 * @sophiaxt/seo-connector-webhook — STUB (stub).
 *
 * Declared so the connector architecture can reference generic webhook, but NOT
 * implemented. Every method throws NotImplementedError until built. Implement by
 * overriding the StubConnector methods and supplying real `capabilities`. See
 * `../sophia-stack` for the reference implementation pattern, and CLAUDE.md for
 * the connector contract rules (non-destructive, draft→approve→apply→rollback).
 */
import { StubConnector } from "@sophiaxt/seo-connector-core";

export class WebhookConnector extends StubConnector {
  readonly id: string;
  readonly platform = "webhook";

  constructor(opts: { id: string }) {
    super();
    this.id = opts.id;
  }
}
