import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from "react-force-graph-2d";

import type { GraphData, GraphEdge, GraphNode, Status } from "@/lib/types";

/* Canvas drawing needs literal colours; these come straight from the spec. */
const STATUS_COLOR: Record<Status, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  review: "#f59e0b",
  done: "#22c55e",
};
const ROLE_COLOR = { pm: "#a78bfa", senior: "#60a5fa", junior: "#94a3b8" } as const;
const PROJECT = "#8b5cf6";
const MILESTONE = "#6366f1";
const BG = "#0b0d14";

type N = NodeObject & GraphNode;
type L = LinkObject & { type: GraphEdge["type"]; s: string; t: string };

export type GraphFilters = {
  department: string;
  status: string;
  edges: Record<GraphEdge["type"], boolean>;
};

function idOf(v: unknown): string {
  return typeof v === "object" && v !== null ? String((v as { id: string }).id) : String(v);
}

export default function GraphCanvas({
  data,
  filters,
  fitSignal,
  onTask,
}: {
  data: GraphData;
  filters: GraphFilters;
  fitSignal: number;
  onTask: (id: string) => void;
}) {
  const fg = useRef<ForceGraphMethods<N, L> | undefined>(undefined);
  const wrap = useRef<HTMLDivElement>(null);
  const cache = useRef(new Map<string, N>());
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const lastBg = useRef(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Merge into existing node objects so positions survive every poll. */
  const graph = useMemo(() => {
    const visible = data.nodes.filter((n) => {
      if (n.type !== "task") return true;
      if (filters.department && n.department !== filters.department) return false;
      if (filters.status && n.status !== filters.status) return false;
      return true;
    });
    const ids = new Set(visible.map((n) => n.id));
    const nodes = visible.map((n) => {
      const prev = cache.current.get(n.id);
      if (prev) {
        Object.assign(prev, n);
        return prev;
      }
      const fresh = { ...n } as N;
      cache.current.set(n.id, fresh);
      return fresh;
    });
    const links: L[] = data.edges
      .filter((e) => filters.edges[e.type] && ids.has(e.source) && ids.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, type: e.type, s: e.source, t: e.target }));
    return { nodes, links };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), JSON.stringify(filters)]);

  const neighbours = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of graph.links) {
      if (!m.has(l.s)) m.set(l.s, new Set());
      if (!m.has(l.t)) m.set(l.t, new Set());
      m.get(l.s)!.add(l.t);
      m.get(l.t)!.add(l.s);
    }
    return m;
  }, [graph]);

  const highlighted = useMemo(() => {
    if (!focus) return null;
    const set = new Set<string>([focus, ...(neighbours.get(focus) ?? [])]);
    return set;
  }, [focus, neighbours]);

  useEffect(() => {
    if (fitSignal) fg.current?.zoomToFit(400, 40);
  }, [fitSignal]);

  const subtree = (rootId: string) => {
    const out = new Set<string>([rootId]);
    const queue = [rootId];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const l of graph.links) {
        if ((l.type === "contains" || l.type === "subtask") && l.s === cur && !out.has(l.t)) {
          out.add(l.t);
          queue.push(l.t);
        }
      }
    }
    return out;
  };

  const dim = (id: string) => highlighted !== null && !highlighted.has(id);

  return (
    <div ref={wrap} className="absolute inset-0" style={{ background: BG }}>
      <ForceGraph2D<N, L>
        ref={fg}
        width={size.w}
        height={size.h}
        graphData={graph}
        backgroundColor={BG}
        autoPauseRedraw={false}
        cooldownTicks={120}
        nodeRelSize={5}
        nodeVal={(n) => (n.type === "project" ? 9 : n.type === "milestone" ? 4 : 1.5)}
        onNodeHover={(n) => setHover(n ? String(n.id) : null)}
        onNodeClick={(n) => {
          if (n.type === "task") onTask(String(n.id).replace(/^task:/, ""));
          else if (n.type === "person") setFocus(focus === n.id ? null : String(n.id));
          else if (n.type === "milestone") {
            const sub = subtree(String(n.id));
            fg.current?.zoomToFit(500, 60, (x) => sub.has(String(x.id)));
          }
        }}
        onBackgroundClick={() => {
          const now = Date.now();
          if (now - lastBg.current < 350) {
            setFocus(null);
            fg.current?.zoomToFit(400, 40);
          }
          lastBg.current = now;
        }}
        linkColor={(l) => {
          const a = dim(l.s) || dim(l.t) ? 0.08 : 1;
          if (l.type === "depends_on") return `rgba(249,115,22,${0.9 * a})`;
          if (l.type === "mentions") return `rgba(34,211,238,${0.7 * a})`;
          if (l.type === "works_on") {
            const person = cache.current.get(l.s)?.type === "person" ? cache.current.get(l.s) : cache.current.get(l.t);
            const c = person?.role ? ROLE_COLOR[person.role] : "#94a3b8";
            return a < 1 ? "rgba(148,163,184,0.06)" : `${c}99`;
          }
          return `rgba(148,163,184,${0.35 * a})`;
        }}
        linkWidth={(l) => (l.type === "depends_on" ? 1.6 : 0.6)}
        linkLineDash={(l) => (l.type === "mentions" ? [3, 3] : null)}
        linkDirectionalArrowLength={(l) => (l.type === "depends_on" ? 4 : 0)}
        linkDirectionalArrowRelPos={0.9}
        linkDirectionalParticles={(l) => (l.type === "depends_on" ? 2 : 0)}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => "#fb923c"}
        nodeCanvasObject={(n, ctx, scale) => {
          const x = n.x ?? 0;
          const y = n.y ?? 0;
          const faded = dim(String(n.id));
          ctx.globalAlpha = faded ? 0.12 : 1;
          const r = n.type === "project" ? 15 : n.type === "milestone" ? 9 : 6;

          if (n.live) {
            const pulse = 3 + Math.sin(Date.now() / 250) * 2;
            ctx.beginPath();
            ctx.arc(x, y, r + pulse + 2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(16,185,129,0.25)";
            ctx.fill();
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }

          if (n.type === "person") {
            const s = 12;
            ctx.beginPath();
            ctx.roundRect(x - s / 2, y - s / 2, s, s, 3);
            ctx.fillStyle = n.role ? ROLE_COLOR[n.role] : "#94a3b8";
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle =
              n.type === "project" ? PROJECT : n.type === "milestone" ? MILESTONE : n.status ? STATUS_COLOR[n.status] : "#94a3b8";
            ctx.fill();
            if (n.overdue) {
              ctx.strokeStyle = "#ef4444";
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          }

          if (hover === n.id || scale > 1.5 || n.type === "project") {
            const fs = 11 / scale;
            ctx.font = `${fs}px Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#e2e8f0";
            ctx.fillText(n.label, x, y + r + 2);
          }
          ctx.globalAlpha = 1;
        }}
        nodePointerAreaPaint={(n, color, ctx) => {
          const r = n.type === "project" ? 15 : n.type === "milestone" ? 9 : 7;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, Math.PI * 2);
          ctx.fill();
        }}
      />
    </div>
  );
}

export const LEGEND = [
  { label: "Project", color: PROJECT },
  { label: "Milestone", color: MILESTONE },
  { label: "To do", color: STATUS_COLOR.todo },
  { label: "In progress", color: STATUS_COLOR.in_progress },
  { label: "Review", color: STATUS_COLOR.review },
  { label: "Done", color: STATUS_COLOR.done },
  { label: "PM", color: ROLE_COLOR.pm, square: true },
  { label: "Senior", color: ROLE_COLOR.senior, square: true },
  { label: "Junior", color: ROLE_COLOR.junior, square: true },
];
