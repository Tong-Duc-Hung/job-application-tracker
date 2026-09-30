/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma 7's client + the pg driver adapter must run as real Node.js
  // modules, not get bundled into the Turbopack/webpack server graph —
  // otherwise SSR breaks with a "Cannot find module '.prisma/client/...'"
  // error.
  serverExternalPackages: ["@prisma/client", "pg"],
};

export default nextConfig;
