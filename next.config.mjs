/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Required to make sql.js work with Webpack inside Next.js
    config.resolve.fallback = {
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
