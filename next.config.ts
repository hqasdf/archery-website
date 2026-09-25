import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  async redirects() {
    return [{ source: "/dashboard", destination: "/sessions", permanent: true }];
  },
};

export default nextConfig;
