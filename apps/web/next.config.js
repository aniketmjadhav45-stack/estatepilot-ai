/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@estatepilot/shared',
    '@estatepilot/validation',
    '@estatepilot/permissions',
    '@estatepilot/database',
    '@estatepilot/auth',
    '@estatepilot/ai-runtime',
    '@estatepilot/agent-registry',
    '@estatepilot/billing',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
