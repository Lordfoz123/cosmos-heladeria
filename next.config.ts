import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Para que el dev server funcione bien detrás de ngrok (evita pantalla en blanco por host/origin bloqueado)
  allowedDevOrigins: ["https://*.ngrok-free.app", "https://*.ngrok.app"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fullframe-design.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;