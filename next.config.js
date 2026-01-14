/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
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
