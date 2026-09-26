import { useDataSource } from "@/hooks/use-data-source";
import { cn } from "@/lib/utils";

/** Always-visible indicator of where data comes from: LIVE or MOCK. */
export function SourcePill({ className }: { className?: string }) {
  const { source } = useDataSource();
  const live = source === "live";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        live
          ? "border-agent/30 bg-agent/12 text-agent"
          : "border-warning/35 bg-warning/12 text-warning-foreground dark:text-warning",
        className,
      )}
      title={live ? "Connected to the live backend" : "Backend unreachable — showing mock demo data"}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          live ? "animate-live-pulse bg-agent" : "bg-warning",
        )}
      />
      {live ? "LIVE" : "MOCK"}
    </span>
  );
}
