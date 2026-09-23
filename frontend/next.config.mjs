import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Real product photography will be added under /public/assets/products.
    // Remote patterns can be added here later if images are ever served
    // from Google Drive / an external CDN instead of bundled locally.
    remotePatterns: [],
  },
};

export default withNextIntl(nextConfig);
