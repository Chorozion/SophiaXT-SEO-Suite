/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Internal workspace packages ship raw TS; let Next transpile them.
  transpilePackages: [
    "@sophiaxt/seo-shared",
    "@sophiaxt/seo-connector-core",
    "@sophiaxt/seo-connector-sophia-stack",
    "@sophiaxt/seo-core",
  ],
};

export default nextConfig;
