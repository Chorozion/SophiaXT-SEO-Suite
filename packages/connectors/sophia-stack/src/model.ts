/**
 * Sophia Stack's native Site Model + patch-op shapes, as observed in the
 * read-only analysis (catalog.json + src/patch.mjs). These are *their* types,
 * reproduced here so the connector can speak them. We never import Sophia Stack
 * source — this is an independent, documentation-derived definition.
 */

export interface SophiaBlock {
  id: string;
  type: string;
  fx?: string[];
  [prop: string]: unknown;
}

export interface SophiaPage {
  title?: string;
  blocks: SophiaBlock[];
  /** NOT native today — lands with extension R1. Optional so models stay valid. */
  seo?: Record<string, unknown>;
}

export interface SophiaModel {
  site: string;
  style?: string;
  brief?: string;
  connections?: Record<string, unknown>;
  pages: Record<string, SophiaPage>;
  data?: { collections?: Record<string, unknown> };
  functions?: Record<string, unknown>;
  /** NOT native today — lands with extension R1. */
  seo?: Record<string, unknown>;
}

/** The six native patch ops (catalog.json). The connector emits these. */
export type SophiaPatchOp =
  | { op: "set"; id: string; path: string; value: unknown }
  | { op: "add"; route: string; value: SophiaBlock; index?: number }
  | { op: "remove"; id: string }
  | { op: "move"; id: string; index: number }
  | { op: "mset"; path: string; value: unknown }
  | { op: "mdel"; path: string };

/** A bounded version snapshot, matching Sophia Stack's history.json entries. */
export interface SophiaSnapshot {
  model: SophiaModel;
  css?: string;
  /** Suite-added label (Sophia Stack today stores none — see extension R4). */
  label?: string;
}
