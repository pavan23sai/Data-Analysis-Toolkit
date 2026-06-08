import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use "export" for GitHub Pages static site deployment
  // Use "standalone" for regular server deployment
  output: "export",

  // If deploying to GitHub Pages with a repo subdirectory (e.g., username.github.io/repo-name),
  // uncomment and set basePath to your repo name:
  // basePath: "/your-repo-name",

  // Static export doesn't support image optimization
  images: {
    unoptimized: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
