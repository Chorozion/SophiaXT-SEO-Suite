import type { SophiaModel } from "./model.js";

/**
 * A sample Site Model mirroring Sophia Stack's `model.json` shape, used to seed
 * the MockTransport so the whole suite runs end-to-end with no live server.
 * Intentionally has SEO gaps (no descriptions, no JSON-LD) so the audit module
 * has something to find.
 */
export const SAMPLE_MODEL: SophiaModel = {
  site: "Summer Skin MI",
  style: "soft",
  brief: "Local medical spa offering skin treatments in Michigan.",
  pages: {
    "/": {
      title: "Summer Skin MI — Medical Spa",
      blocks: [
        { id: "nav1", type: "nav", brand: "Summer Skin MI", links: ["/services", "/about", "/contact"] },
        {
          id: "hero1",
          type: "hero",
          headline: "Glowing skin, all year round",
          sub: "Medical-grade facials, peels, and laser treatments.",
          cta: { label: "Book now", href: "/contact" },
        },
        { id: "features1", type: "features", items: [
          { t: "Facials", d: "Custom medical facials." },
          { t: "Laser", d: "Laser hair + skin resurfacing." },
        ] },
        { id: "footer1", type: "footer", text: "© Summer Skin MI" },
      ],
    },
    "/services": {
      title: "Services",
      blocks: [
        { id: "nav2", type: "nav", brand: "Summer Skin MI", links: ["/services", "/about", "/contact"] },
        { id: "hero2", type: "hero", headline: "Our services" },
        { id: "footer2", type: "footer", text: "© Summer Skin MI" },
      ],
    },
    "/about": {
      // Note: no title set — the audit should flag this.
      blocks: [
        { id: "nav3", type: "nav", brand: "Summer Skin MI", links: ["/services", "/about", "/contact"] },
        { id: "footer3", type: "footer", text: "© Summer Skin MI" },
      ],
    },
  },
};
