/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Receipt photos are uploaded through a server action (up to 8 MB);
      // the default 1 MB limit would reject them in production.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
