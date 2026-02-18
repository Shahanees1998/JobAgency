/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Serve app logo when browser requests default favicon URL (stops globe fallback)
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/images/logo.png' }];
  },
  images: {
    domains: [],
    unoptimized: true, // For Vercel deployment compatibility
  },
  experimental: {
    serverComponentsExternalPackages: ['chart.js'],
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'canvas'];
    return config;
  },
}

module.exports = nextConfig
