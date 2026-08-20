/** @type {import('next').NextConfig} */

// Safely pull the variable from your .env file.
// If it's empty (like running locally without it), it defaults to ''.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''; 

const nextConfig = {
  // Only include basePath if it's not empty, otherwise Next.js router breaks
  ...(basePath ? { basePath } : {}),
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
        source: `${basePath}/uploads/:path*`, 
        destination: '/uploads/:path*' 
      }, 
      { 
        source: '/:slug.md',
        destination: '/api/md',
      },
    ];
  },
};

export default nextConfig;
