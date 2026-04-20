/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push("encoding");
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  reactStrictMode: false,
  logging: {
    fetches: {
      fullUrl: true,
      level: "verbose",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/**",
      },
    ],
  },
  redirects: () => {
    return [
      {
        source: "/stats",
        destination: "/stats/treasury",
        permanent: true,
      },
      {
        source: "/vote",
        destination: "https://nouns.wtf/vote",
        permanent: false,
      },
      {
        source: "/vote/:id",
        destination: "https://nouns.wtf/vote/:id",
        permanent: false,
      },
      {
        source: "/convert",
        destination: "/",
        permanent: false,
      },
      {
        source: "/proposals",
        destination: "https://nouns.wtf/vote",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
