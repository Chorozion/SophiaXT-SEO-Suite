/**
 * Tiers are additive: Growth includes Starter, Agency includes Growth.
 * Source of truth for which capabilities a customer can reach.
 */
export const TIERS = ["starter", "growth", "agency"] as const;
export type Tier = (typeof TIERS)[number];

/** Numeric rank for "at least this tier" comparisons. */
export const TIER_RANK: Record<Tier, number> = {
  starter: 1,
  growth: 2,
  agency: 3,
};

export const TIER_LABELS: Record<Tier, string> = {
  starter: "Tier 1 — Starter SEO",
  growth: "Tier 2 — Growth SEO",
  agency: "Tier 3 — Agency / SophiaXT Pro",
};

/** True when `have` satisfies the `required` minimum tier. */
export function tierSatisfies(have: Tier, required: Tier): boolean {
  return TIER_RANK[have] >= TIER_RANK[required];
}
