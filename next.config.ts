import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  /**
   * Runs the redirects logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  async redirects() {
    return [
      {
        source: "/products/:path*",
        destination: "/proctors/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
