/** @type {import('next').NextConfig} */

// Base path must be only a path, e.g. "/fitnessarts" (not a full URL).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  ...(basePath ? { basePath } : {}),

  outputFileTracingRoot: process.cwd(),
  
   typescript: {
    ignoreBuildErrors: true,
  },

 experimental: {
  cpus: 1,

  // Use a Node worker thread instead of a separate child process.
  workerThreads: true,

  // Keep webpack build worker disabled for cPanel.
  webpackBuildWorker: false,

  // Keep memory/concurrency low.
  parallelServerCompiles: false,
  parallelServerBuildTraces: false,

  // Process only one static page at a time.
  staticGenerationMaxConcurrency: 1,
  staticGenerationMinPagesPerWorker: 1000,
},

  productionBrowserSourceMaps: false,

  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },

  trailingSlash: false,

  serverExternalPackages: ['@prisma/client', 'prisma'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/uploads/:path*',
      },
      {
        source: '/:slug.md',
        destination: '/api/md',
      },
    ];
  },
};

export default nextConfig;
