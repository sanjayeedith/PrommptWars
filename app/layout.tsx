import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { cn } from "@/utils";

/* Hallmark · genre: atmospheric · theme: night-harbor
 * Psychology: soft presence, controllable setup, always-visible safety.
 * Avoids purple/indigo AI-slop and warm-cream terracotta defaults.
 */

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Anchor — a voice that picks up at 3am",
  description:
    "A voice-first companion for people navigating substance use disorder. Speak once and get grounding, scripts, and support without typing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          display.variable,
          sans.variable,
          "min-h-screen overflow-x-clip bg-[var(--bg)] font-[family-name:var(--font-body)] text-[var(--ink)] antialiased",
        )}
      >
        <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,oklch(0.35_0.04_200_/_0.55),transparent_55%),radial-gradient(ellipse_at_90%_10%,oklch(0.28_0.05_145_/_0.4),transparent_50%),linear-gradient(180deg,oklch(0.16_0.02_230),oklch(0.12_0.015_220))]" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E')]" />
        </div>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-[var(--accent-contrast)]"
        >
          Skip to main content
        </a>
        <main id="main" className="grow">
          {children}
        </main>
      </body>
    </html>
  );
}
