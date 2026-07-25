import { fetchAccessToken } from "hume";
import ChatLoader from "@/components/ChatLoader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Mints a short-lived Hume access token on the server when .env keys exist.
 * Evaluators can also paste keys in the hamburger Settings panel — those
 * override via /api/hume/token without a rebuild.
 */
export default async function Page() {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;

  let accessToken = "";
  if (apiKey && secretKey) {
    try {
      accessToken = await fetchAccessToken({ apiKey, secretKey });
    } catch {
      accessToken = "";
    }
  }

  return (
    <div className="flex grow flex-col">
      <ChatLoader
        accessToken={accessToken}
        serverConfigId={process.env.NEXT_PUBLIC_HUME_CONFIG_ID}
      />
    </div>
  );
}
