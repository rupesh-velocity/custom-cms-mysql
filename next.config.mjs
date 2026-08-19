/** @type {import('next').NextConfig} */
const nextConfig = {
basePath: '/newweb-new',
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
        source: '/newweb-new/uploads/:path*', destination: '/uploads/:path*' }, { source: '/:slug.md',
        destination: '/api/md',
      },
    ];
  },
};

export default nextConfig;
