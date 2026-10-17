import { cache } from "react";
import { connection } from "next/server";
import { getAirportStatusSnapshot } from "@/lib/airport-status/service";
import { buildAirportView } from "@/lib/airport-status/view";
import { AirportStatusBanner, AirportStatusCard, AirportStatusSidebar } from "./airport-status";

/** One snapshot per request, shared by all three presentations. */
const loadView = cache(async () => {
  // Render per request: freshness is judged against "now", so a cached page
  // (ISR serves stale-while-revalidate) could show old data as current.
  await connection();
  const now = new Date();
  const snapshot = await getAirportStatusSnapshot({ now });
  if (snapshot.issues.length > 0) console.warn("[airport-status]", snapshot.mode, snapshot.issues.slice(0, 20));
  if (snapshot.conflicts.length > 0) console.info("[airport-status] conflicts", JSON.stringify(snapshot.conflicts));
  return buildAirportView(snapshot, now);
});

export async function AirportStatusSidebarLoader({ className }: { className?: string }) {
  return <AirportStatusSidebar view={await loadView()} className={className} />;
}

export async function AirportStatusCardLoader({ className }: { className?: string }) {
  return <AirportStatusCard view={await loadView()} className={className} />;
}

export async function AirportStatusBannerLoader({ className }: { className?: string }) {
  return <AirportStatusBanner view={await loadView()} className={className} />;
}
