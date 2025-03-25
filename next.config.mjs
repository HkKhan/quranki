/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable treating ESLint errors as build failures
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during build
  typescript: {
    // Warning: This ignores TypeScript errors during build
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Only include Node.js modules in the server-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        os: false,
        path: false,
        stream: false,
        util: false,
        crypto: false,
      };
    }
    return config;
  },
  // Configured for Next.js 15.1
  experimental: {
    serverActions: {
      // This is what used to be serverExternalPackages in Next.js 14
      allowedExternalPackages: ["nodemailer"],
    },
  },
};

export default nextConfig;
