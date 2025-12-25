import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone", // For Docker deployment
  serverActions: {
    bodySizeLimit: "50mb", // Increase body size limit for file uploads
  },
  /* config options here */
};

export default withNextIntl(nextConfig);
