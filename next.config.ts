import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf / pdfjs-dist를 Next가 제대로 트랜스파일하도록
  transpilePackages: ["react-pdf", "pdfjs-dist"],

  webpack: (config, { isServer }) => {
    // pdfjs-dist가 Node 경로(canvas)를 잡아도 번들에서 제외시키기
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };

    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      canvas: false,
      fs: false,
      path: false,
    };

    return config;
  },
};

export default nextConfig;