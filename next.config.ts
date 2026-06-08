import type { NextConfig } from "next";

const repoName = process.env.NEXT_PUBLIC_REPO_NAME || "";

const nextConfig: NextConfig = {
  // Use "export" for GitHub Pages static site deployment
  // Use "standalone" for regular server deployment
  output: "export",

  // GitHub Pages basePath: set NEXT_PUBLIC_REPO_NAME env var to your repo name
  // e.g. if your repo is "username/my-data-toolkit", set it to "my-data-toolkit"
  // For username.github.io (org site), leave it empty
  ...(repoName ? { basePath: `/${repoName}` } : {}),

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
