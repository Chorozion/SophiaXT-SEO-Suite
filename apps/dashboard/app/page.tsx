import Link from "next/link";
import { modulesForTier, TIER_LABELS } from "@sophiaxt/seo-shared";
import { getDemoAudit } from "./lib/demo-site";

/**
 * Dashboard home (server component). In the foundation build it shows:
 *   - the demo site (mock Sophia Stack connector),
 *   - a live audit score + findings (real audit engine), and
 *   - the modules the current tier exposes.
 */
export default async function HomePage() {
  const tier = "agency" as const;
  const { site, findings, score } = await getDemoAudit(tier);
  const modules = modulesForTier(tier);

  return (
    <main className="space-y-10">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Connected site (mock)</p>
            <h2 className="text-lg font-medium">{site.name}</h2>
            <p className="text-sm text-zinc-400">
              {site.pages.length} pages · platform: sophia-stack
            </p>
          </div>
          <ScoreBadge score={score.overall} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Audit findings ({findings.length})
        </h3>
        <ul className="space-y-2">
          {findings.map((f, i) => (
            <li
              key={`${f.code}-${i}`}
              className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
            >
              <SeverityDot severity={f.severity} />
              <div>
                <p className="text-sm font-medium">{f.title}</p>
                <p className="text-xs text-zinc-500">
                  <code>{f.code}</code> ·{" "}
                  {f.target.scope === "page" ? f.target.pageId : f.target.scope}
                </p>
                {f.suggestedChange && (
                  <p className="mt-1 text-xs text-accent/90">→ {f.suggestedChange.summary}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          Findings are read-only. Turning one into a change goes through{" "}
          <span className="text-zinc-300">draft → preview → approve → apply</span>.
        </p>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          {TIER_LABELS[tier]} — available modules
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {modules.map((m) => (
            <div key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
              <p className="text-sm font-medium">{m.title}</p>
              <p className="text-xs text-zinc-500">{m.summary}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          <Link href="/safe-workflow" className="text-accent underline">
            How the safe edit workflow protects your site →
          </Link>
        </p>
      </section>
    </main>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400";
  return (
    <div className="text-right">
      <p className="text-xs uppercase tracking-wide text-zinc-500">SEO score</p>
      <p className={`text-3xl font-bold ${tone}`}>{score}</p>
    </div>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === "critical" || severity === "high"
      ? "bg-rose-500"
      : severity === "medium"
        ? "bg-amber-500"
        : "bg-zinc-500";
  return <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} aria-label={severity} />;
}
