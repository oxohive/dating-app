/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a pruned .next/standalone server (minimal runtime
  // node_modules + a generated server.js) so the production Docker image
  // (./Dockerfile) can ship a small runtime stage instead of the full
  // source tree + node_modules. See tasks/0013-deploy-admin-web-and-marketing-site.
  output: "standalone",
};

module.exports = nextConfig;
