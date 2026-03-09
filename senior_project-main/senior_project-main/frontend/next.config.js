// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // กลับไปใช้ static export
  
  // เพิ่ม trailingSlash เพื่อให้ routing ทำงานถูกต้องกับ static export
  trailingSlash: true,
  
  images: {
    unoptimized: true, // ❗ ปิดการใช้ Image Optimization API
  },
  // config options here
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
    };
    return config;
  },
  // Set default port
  env: {
    PORT: process.env.PORT || '8010',
  },
};

module.exports = nextConfig;
