import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@habita/api-client", "@habita/contracts", "@habita/design-tokens", "@habita/domain"],
};

export default nextConfig;
