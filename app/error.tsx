"use client";

/**
 * App-level error boundary. Even on failure, the crisis path stays visible
 * as a tel: link so a crash never leaves someone without 988.
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-screen place-content-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="opacity-70">You can try again, or get help right now.</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10"
        >
          Try again
        </button>
        <a
          href="tel:988"
          className="rounded-lg bg-rose-500 px-4 py-2 font-semibold text-white hover:bg-rose-400"
        >
          Call or text 988
        </a>
      </div>
    </div>
  );
}
