import type { SophiaModel, SophiaPatchOp, SophiaSnapshot } from "../model.js";
import { SAMPLE_MODEL } from "../fixture.js";
import type { SophiaStackTransport } from "./transport.js";

/**
 * In-memory transport that reproduces Sophia Stack's patch semantics:
 * apply-to-clone → (validate) → snapshot previous → commit. History is bounded
 * to 30 like the real `history.json`. This lets the suite exercise the full
 * read → plan → apply → rollback loop with no live server.
 *
 * The patch application here is a faithful-but-minimal port of the documented
 * ops (set/add/remove/move/mset/mdel). It is NOT Sophia Stack source — it's an
 * independent reimplementation for the mock.
 */
const HISTORY_LIMIT = 30;

export class MockTransport implements SophiaStackTransport {
  private model: SophiaModel;
  private history: SophiaSnapshot[] = [];

  constructor(seed: SophiaModel = structuredClone(SAMPLE_MODEL)) {
    this.model = structuredClone(seed);
  }

  async ping() {
    return { ok: true, site: this.model.site, canWrite: true };
  }

  async getModel() {
    return structuredClone(this.model);
  }

  async patch(ops: SophiaPatchOp[], opts?: { label?: string; dryRun?: boolean }) {
    // Apply to a clone first (validate-before-commit parity).
    const draft = structuredClone(this.model);
    const changed: string[] = [];
    for (const op of ops) {
      applyOp(draft, op, changed);
    }
    validateModel(draft); // throws on invalid → caller sees a failed apply

    if (opts?.dryRun) {
      return { ok: true, changed };
    }

    // Snapshot the *previous* state, then commit.
    this.history.push({ model: structuredClone(this.model), label: opts?.label });
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.model = draft;
    return { ok: true, changed };
  }

  async rollback() {
    const snap = this.history.pop();
    if (!snap) return { ok: true, restored: false, remaining: 0 };
    this.model = snap.model;
    return { ok: true, restored: true, remaining: this.history.length };
  }

  async versions() {
    return { count: this.history.length };
  }
}

/* --- minimal patch-op application over the cloned model -------------------- */

function applyOp(model: SophiaModel, op: SophiaPatchOp, changed: string[]): void {
  switch (op.op) {
    case "mset":
      setPath(model, op.path, op.value);
      changed.push(op.path);
      break;
    case "mdel":
      delPath(model, op.path);
      changed.push(op.path);
      break;
    case "set": {
      const block = findBlock(model, op.id);
      if (!block) throw new Error(`set: block ${op.id} not found`);
      setPath(block, op.path, op.value);
      changed.push(`${op.id}.${op.path}`);
      break;
    }
    case "add": {
      const page = model.pages[op.route];
      if (!page) throw new Error(`add: route ${op.route} not found`);
      if (!op.value?.id) throw new Error("add: block value must have an id");
      const idx = op.index ?? page.blocks.length;
      page.blocks.splice(idx, 0, op.value);
      changed.push(op.value.id);
      break;
    }
    case "remove": {
      for (const page of Object.values(model.pages)) {
        const i = page.blocks.findIndex((b) => b.id === op.id);
        if (i >= 0) {
          page.blocks.splice(i, 1);
          changed.push(op.id);
          return;
        }
      }
      throw new Error(`remove: block ${op.id} not found`);
    }
    case "move": {
      for (const page of Object.values(model.pages)) {
        const i = page.blocks.findIndex((b) => b.id === op.id);
        if (i >= 0) {
          const [b] = page.blocks.splice(i, 1);
          page.blocks.splice(op.index, 0, b!);
          changed.push(op.id);
          return;
        }
      }
      throw new Error(`move: block ${op.id} not found`);
    }
  }
}

/** Dot-path set, creating intermediate objects. Mirrors mset/set semantics. */
function setPath(root: Record<string, unknown> | object, path: string, value: unknown): void {
  const parts = path.split(".").filter(Boolean);
  let cur = root as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i]!;
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}

function delPath(root: object, path: string): void {
  const parts = path.split(".").filter(Boolean);
  let cur = root as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i]!;
    if (typeof cur[k] !== "object" || cur[k] === null) return;
    cur = cur[k] as Record<string, unknown>;
  }
  delete cur[parts[parts.length - 1]!];
}

function findBlock(model: SophiaModel, id: string) {
  for (const page of Object.values(model.pages)) {
    const b = page.blocks.find((x) => x.id === id);
    if (b) return b;
  }
  return null;
}

/** Minimal mirror of Sophia Stack's validateModel: pages object, unique block ids. */
function validateModel(model: SophiaModel): void {
  if (!model.pages || typeof model.pages !== "object") {
    throw new Error("invalid model: pages missing");
  }
  const seen = new Set<string>();
  for (const [route, page] of Object.entries(model.pages)) {
    if (!Array.isArray(page.blocks)) throw new Error(`invalid page ${route}: blocks not array`);
    for (const b of page.blocks) {
      if (!b.id) throw new Error(`invalid block in ${route}: missing id`);
      if (seen.has(b.id)) throw new Error(`duplicate block id: ${b.id}`);
      seen.add(b.id);
    }
  }
}
