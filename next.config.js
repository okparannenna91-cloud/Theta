/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['img.clerk.com', 'res.cloudinary.com'],
  },

  // Enforce canonical domain: always redirect to https://www.thetapm.site
  async redirects() {
    return [
      // http://thetapm.site/* → https://www.thetapm.site/*
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'thetapm.site' }],
        destination: 'https://www.thetapm.site/:path*',
        permanent: true, // 308
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig

