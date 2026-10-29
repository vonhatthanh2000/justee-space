import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      {
        source: "/blog",
        has: [{ type: "query", key: "lang", value: "en" }],
        destination: "/blog/en",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
