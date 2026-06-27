/** Thrown by connector stubs for capabilities that aren't built yet. */
export class NotImplementedError extends Error {
  constructor(connector: string, method: string) {
    super(`[${connector}] ${method} is not implemented yet.`);
    this.name = "NotImplementedError";
  }
}

/** Thrown when a ChangeSet reaches apply without an approver. The safety gate. */
export class NotApprovedError extends Error {
  constructor(changeSetId: string) {
    super(`ChangeSet ${changeSetId} cannot be applied without an approver.`);
    this.name = "NotApprovedError";
  }
}

/** Thrown when a requested operation exceeds the connector's capabilities. */
export class CapabilityError extends Error {
  constructor(connector: string, capability: string) {
    super(`[${connector}] does not support capability: ${capability}.`);
    this.name = "CapabilityError";
  }
}
