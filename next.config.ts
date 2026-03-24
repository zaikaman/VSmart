import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Chừa thêm dung lượng cho multipart boundary để file 10MB không bị 413 từ proxy nội bộ của Next.
    proxyClientMaxBodySize: '12mb',
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
