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
};

export default nextConfig;
