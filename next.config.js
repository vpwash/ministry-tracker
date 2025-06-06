/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [
    /middleware-manifest\.json$/,
    /_middleware\.js$/,
    /middleware\.js$/,
    /\_next/,
  ],
  // Custom offline page
  fallbacks: {
    document: '/_offline',
  },
  // Cache all static files by default
  runtimeCaching: [
    {
      urlPattern: /\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'start-url',
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|svg|gif|webp|ico|json)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
});

// Determine the base URL based on the environment
const isProduction = process.env.NODE_ENV === 'production';
const basePath = isProduction ? process.env.BASE_PATH || '' : '';

const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Set base path if provided
  basePath,
  
  // Configure images
  images: {
    domains: ['localhost'],
    unoptimized: true, // Disable Image Optimization API for Docker
  },
  
  // Enable React Strict Mode
  reactStrictMode: true,
  
  // Webpack configuration
  webpack: (config) => {
    // Required for Dexie.js to work with Next.js
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      path: false,
      os: false,
      http: false,
      https: false,
      zlib: false,
    };
    
    return config;
  },
  
  // Custom headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self)',
          },
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
        ],
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  },
  
  // Disable telemetry in production
  telemetry: false,
  
  // Enable static export for PWA
  trailingSlash: true,
};

module.exports = withPWA(nextConfig);
