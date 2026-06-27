import Link from "next/link";

/** Static explainer of the owner-safe editing lifecycle. */
export default function SafeWorkflowPage() {
  const steps = [
    ["Analyze", "Read-only. Modules pull site data through the connector. Nothing is written."],
    ["Propose", "A module's plan() produces a ChangeSet: a described, previewable edit."],
    ["Draft", "The ChangeSet is stored as a Draft. Generated content stays unpublished."],
    ["Preview", "The owner sees exactly what will change (before/after, affected pages)."],
    ["Approve", "An authorized user approves. Tier 3 can require multi-step workflows."],
    ["Apply", "Only now does the connector touch the site (validate-before-commit patch)."],
    ["Version", "The apply records a Version with before/after for the audit trail."],
    ["Rollback", "One action reverts to the prior Version when the platform supports it."],
  ];
  return (
    <main className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Owner-safe editing</h2>
        <p className="text-sm text-zinc-400">
          The product&apos;s central promise: owners cannot break their website.
        </p>
      </div>
      <ol className="space-y-2">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs text-accent">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-zinc-500">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/" className="inline-block text-sm text-accent underline">
        ← Back to dashboard
      </Link>
    </main>
  );
}
