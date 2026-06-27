import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sophia SEO Suite",
  description: "Safe, modular SEO/GEO automation for SophiaXT websites.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-5xl px-6 py-8">
          <header className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h1 className="text-xl font-semibold">
                Sophia <span className="text-accent">SEO Suite</span>
              </h1>
              <p className="text-sm text-zinc-400">Safe, modular SEO/GEO automation</p>
            </div>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
              foundation build
            </span>
          </header>
          {children}
          <footer className="mt-12 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            Every change is drafted, previewed, approved, logged, and reversible. No
            direct live edits by default.
          </footer>
        </div>
      </body>
    </html>
  );
}
