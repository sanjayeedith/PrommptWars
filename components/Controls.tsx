"use client";

import { useMicFft, useVoice } from "@humeai/voice-react";
import { Button } from "./ui/button";
import { Mic, MicOff, Phone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Toggle } from "./ui/toggle";
import MicFFT from "./MicFFT";
import { cn } from "@/utils";

/**
 * In-call controls. Mic mute uses the Toggle's pressed value directly so it
 * cannot flip twice on one click (a common Radix + async-state flicker).
 */
export default function Controls() {
  const { disconnect, status, isMuted, unmute, mute } = useVoice();
  const micFft = useMicFft();

  return (
    <div
      className={cn(
        "fixed bottom-20 left-0 z-40 flex w-full items-center justify-center p-4",
        "bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/90 to-transparent",
      )}
    >
      <AnimatePresence>
        {status.value === "connected" ? (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <Toggle
              pressed={!isMuted}
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              onPressedChange={(pressed) => {
                if (pressed) unmute();
                else mute();
              }}
            >
              {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </Toggle>

            <div className="relative grid h-8 w-48 shrink grow-0">
              <MicFFT fft={isMuted ? [] : micFft} className="fill-current" />
            </div>

            <Button
              className="flex items-center gap-1"
              onClick={() => void disconnect()}
              variant="destructive"
            >
              <Phone className="size-4 opacity-50" strokeWidth={2} stroke="currentColor" />
              <span>End Call</span>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
