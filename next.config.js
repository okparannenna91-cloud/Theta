/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.ANALYZE === 'true' ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    recharts: {
      transform: 'recharts/es6/{{member}}',
    },
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
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.thetapm.site https://*.clerk.com",
              "script-src-elem 'self' 'unsafe-inline' https://clerk.thetapm.site https://*.clerk.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.cloudinary.com https://img.clerk.com https://*.gravatar.com",
              "connect-src 'self' https://*.ably.io wss://*.ably.io https://*.upstash.io https://api.clerk.com https://clerk.thetapm.site wss://clerk.thetapm.site https://*.clerk.com https://api.openai.com https://*.posthog.com https://api.posthog.com https://accounts.google.com https://*.googleapis.com https://oauth2.googleapis.com",
              "font-src 'self' data:",
              "frame-src 'self' https://clerk.thetapm.site https://*.accounts.dev https://*.clerk.accounts.dev https://clerk.com https://accounts.google.com",
              "worker-src 'self' https://clerk.thetapm.site https://*.clerk.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig

