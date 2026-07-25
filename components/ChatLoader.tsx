"use client";

import dynamic from "next/dynamic";

const Anchor = dynamic(() => import("@/components/Anchor"), { ssr: false });

export default function ChatLoader({
  accessToken,
  serverConfigId,
}: {
  accessToken: string;
  serverConfigId?: string;
}) {
  return <Anchor accessToken={accessToken} serverConfigId={serverConfigId} />;
}
