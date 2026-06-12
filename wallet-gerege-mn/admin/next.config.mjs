// Subpath deployment (жишээ нь /wallet-admin) — build үед NEXT_PUBLIC_BASE_PATH
// өгвөл бүх route/asset тэр зам дор үйлчилнэ (compose build arg-аар дамжина).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  ...(basePath ? { basePath } : {}),
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};
export default nextConfig;
