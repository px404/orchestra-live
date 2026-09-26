import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getMockMode,
  getSource,
  onSourceFlip,
  startSourceMonitor,
  subscribeSource,
  type DataSource,
  type MockMode,
} from "@/lib/api";

/** Current data source (live | mock) plus the configured mock mode. */
export function useDataSource(): { source: DataSource; mode: MockMode } {
  const [snapshot, setSnapshot] = useState<{ source: DataSource; mode: MockMode }>({
    source: "mock",
    mode: "auto",
  });

  useEffect(() => {
    const sync = () => setSnapshot({ source: getSource(), mode: getMockMode() });
    sync();
    return subscribeSource(sync);
  }, []);

  return snapshot;
}

/** Starts the health monitor and toasts once whenever the source flips. */
export function useSourceMonitor() {
  const queryClient = useQueryClient();

  useEffect(() => {
    startSourceMonitor();
    return onSourceFlip((next) => {
      queryClient.clear();
      if (next === "mock") {
        toast.warning("Backend offline, showing mock data");
      } else {
        toast.success("Connected to live backend");
      }
    });
  }, [queryClient]);
}
