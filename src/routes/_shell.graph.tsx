import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Maximize } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import type { GraphFilters } from "@/components/graph/graph-canvas";
import { Button } from "@/components/ui/button";
import { useOpenTask } from "@/hooks/use-task-param";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/format";
import { graphQuery, meQuery } from "@/lib/queries";
import type { GraphEdge } from "@/lib/types";
import { cn } from "@/lib/utils";

const GraphCanvas = lazy(() => import("@/components/graph/graph-canvas"));

export const Route = createFileRoute("/_shell/graph")({
  head: () => ({
    meta: [
      { title: "Project graph — Orchestra" },
      { name: "description", content: "Relational graph of milestones, tasks and the people working together." },
      { property: "og:title", content: "Project graph — Orchestra" },
      { property: "og:description", content: "Relational graph of milestones, tasks and the people working together." },
    ],
  }),
  component: GraphPage,
});

const EDGE_TYPES: { type: GraphEdge["type"]; label: string }[] = [
  { type: "contains", label: "Contains" },
  { type: "subtask", label: "Subtask" },
  { type: "depends_on", label: "Depends on" },
  { type: "mentions", label: "Mentions" },
  { type: "works_on", label: "Works on" },
];

const LEGEND = [
  { label: "Project", color: "#8b5cf6" },
  { label: "Milestone", color: "#6366f1" },
  { label: "To do", color: "#94a3b8" },
  { label: "In progress", color: "#3b82f6" },
  { label: "Review", color: "#f59e0b" },
  { label: "Done", color: "#22c55e" },
  { label: "PM", color: "#a78bfa", square: true },
  { label: "Senior", color: "#60a5fa", square: true },
  { label: "Junior", color: "#94a3b8", square: true },
];

function GraphPage() {
  const { data: me } = useQuery(meQuery());
  const navigate = useNavigate();
  const openTask = useOpenTask();
  const { data } = useQuery({ ...graphQuery(), enabled: Boolean(me?.capabilities.graph) });
  const [fit, setFit] = useState(0);
  const [filters, setFilters] = useState<GraphFilters>({
    department: "",
    status: "",
    edges: { contains: true, subtask: true, depends_on: true, mentions: true, works_on: true },
  });

  useEffect(() => {
    if (me && !me.capabilities.graph) void navigate({ to: "/board", replace: true });
  }, [me, navigate]);
  if (!me?.capabilities.graph) return null;

  const departments = [...new Set((data?.nodes ?? []).map((n) => n.department).filter(Boolean) as string[])].sort();
  const select =
    "h-8 rounded-md border border-white/15 bg-white/5 px-2 text-xs text-slate-200 [&>option]:bg-slate-900";

  return (
    <div className="dark relative h-full min-h-[500px] overflow-hidden">
      {data ? (
        <Suspense fallback={null}>
          <GraphCanvas data={data} filters={filters} fitSignal={fit} onTask={(id) => openTask(id)} />
        </Suspense>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-sm text-slate-400">
          Loading graph…
        </div>
      )}

      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 p-2 text-slate-200 backdrop-blur">
        <select
          className={select}
          value={filters.department}
          onChange={(e) => setFilters({ ...filters, department: e.target.value })}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select className={select} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {EDGE_TYPES.map((e) => (
          <button
            key={e.type}
            type="button"
            onClick={() => setFilters({ ...filters, edges: { ...filters.edges, [e.type]: !filters.edges[e.type] } })}
            className={cn(
              "rounded-full border px-2 py-1 text-[11px]",
              filters.edges[e.type] ? "border-white/30 bg-white/15" : "border-white/10 text-slate-500",
            )}
          >
            {e.label}
          </button>
        ))}
        <Button size="sm" variant="secondary" className="h-8" onClick={() => setFit((n) => n + 1)}>
          <Maximize className="size-3.5" /> Fit
        </Button>
      </div>

      <div className="absolute bottom-3 left-3 grid grid-cols-3 gap-x-4 gap-y-1 rounded-xl border border-white/10 bg-slate-950/80 p-3 text-[11px] text-slate-300 backdrop-blur">
        {LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={cn("size-2.5", l.square ? "rounded-[3px]" : "rounded-full")} style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-orange-500" /> Depends on
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-3 border-t border-dashed border-cyan-400" /> Mentions
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full ring-2 ring-emerald-500" /> Live
        </span>
      </div>
      <p className="absolute right-3 bottom-3 text-[11px] text-slate-500">
        Click a person to highlight · double-click background to reset
      </p>
    </div>
  );
}
