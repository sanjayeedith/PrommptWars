"use client";

import { cn } from "@/utils";
import { motion } from "framer-motion";

const BARS = 24;
const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 32;

/** Microphone level meter, drawn in a fixed viewBox so it scales with CSS alone. */
export default function MicFFT({
  fft,
  className,
}: {
  fft: readonly number[];
  className?: string;
}) {
  return (
    <motion.svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn("absolute inset-0 size-full", className)}
    >
      {Array.from({ length: BARS }).map((_, index) => {
        const value = (fft[index] ?? 0) / 4;
        const height = Math.min(Math.max(VIEW_HEIGHT * value, 2), VIEW_HEIGHT);
        return (
          <motion.rect
            key={`mic-fft-${index}`}
            height={height}
            width={2}
            x={(index * VIEW_WIDTH) / BARS + 1}
            y={VIEW_HEIGHT * 0.5 - height * 0.5}
            rx={2}
          />
        );
      })}
    </motion.svg>
  );
}
