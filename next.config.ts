import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * React's development build needs `unsafe-eval` for call-stack reconstruction.
 * Production keeps a tighter script-src without it. Hume WebSocket + blob
 * audio worklets are allowlisted for the voice session.
 */
const isDev = process.env.NODE_ENV !== "production";

// EVI streams assistant audio through an AudioWorklet whose module the SDK
// fetches from Google Cloud Storage. A worklet module is a script resource, so
// it needs script-src (plus worker-src/connect-src for browsers that check
// those). Scoped to the SDK's asset prefix rather than the whole bucket host.
const HUME_AUDIO_WORKLET = "https://storage.googleapis.com/evi-react-sdk-assets/";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      isDev
        ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${HUME_AUDIO_WORKLET}`
        : `script-src 'self' 'unsafe-inline' ${HUME_AUDIO_WORKLET}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "media-src 'self' blob:",
      `worker-src 'self' blob: ${HUME_AUDIO_WORKLET}`,
      `connect-src 'self' https://api.hume.ai wss://api.hume.ai ws://localhost:3000 wss://localhost:3000 ${HUME_AUDIO_WORKLET}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lets LAN access reach Next.js HMR without cross-origin blocks in the lab.
  allowedDevOrigins: ["192.168.18.194", "localhost:3000"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
