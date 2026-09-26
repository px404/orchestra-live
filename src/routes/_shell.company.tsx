import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, Lock, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { RoleBadge } from "@/components/role-badge";
import { Avatar, Chip, DueLabel, StatusPill } from "@/components/task-bits";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCompanyView } from "@/hooks/use-company-view";
import { money, STATUS_LABEL, STATUS_ORDER } from "@/lib/format";
import { companyOverviewQuery, companyTaskQuery, companyTasksQuery } from "@/lib/queries";
import type { Overview, Status, TaskDetail, TaskSummary, UserRef } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/company")({
  head: () => ({
    meta: [
      { title: "Company progress — Orchestra" },
      { name: "description", content: "A privacy-safe view of company tasks, progress, people and spend." },
      { property: "og:title", content: "Company progress — Orchestra" },
      { property: "og:description", content: "A privacy-safe view of company tasks, progress, people and spend." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyPage,
});

type GroupBy = "milestone" | "department" | "person";
type Panel = { kind: "task"; id: string } | { kind: "person"; user: UserRef } | null;

const COMPANY_STATUS: Record<Status, string> = {
  todo: "bg-company-todo text-company-todo-foreground",
  in_progress: "bg-company-progress text-company-progress-foreground",
  review: "bg-company-review text-company-review-foreground",
  done: "bg-company-done text-company-done-foreground",
};

const EXPLANATION =
  "For startups: see the whole company's progress at a glance. Every task, who's on it and what it costs. Progress only: no prompts or agent reports.";

function CompanyPage() {
  const navigate = useNavigate();
  const { enabled } = useCompanyView();
  const { data: me } = useQuery({ queryKey: ["me"], staleTime: 5 * 60_000 });
  const allowed = Boolean((me as { capabilities?: { graph?: boolean } } | undefined)?.capabilities?.graph);
  const { data: tasks = [] } = useQuery({ ...companyTasksQuery({}), enabled: allowed && enabled });
  const { data: overview } = useQuery({ ...companyOverviewQuery(), enabled: allowed && enabled });
  const [groupBy, setGroupBy] = useState<GroupBy>("milestone");
  const [panel, setPanel] = useState<Panel>(null);

  useEffect(() => {
    if (me && (!allowed || !enabled)) void navigate({ to: "/board", replace: true });
  }, [allowed, enabled, me, navigate]);

  if (!allowed || !enabled) return null;

  return (
    <div className="min-h-full bg-surface/45 p-4 sm:p-6">
      <header className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold text-primary">COMPANY VIEW</p>
          <h1 className="mt-1 text-2xl font-semibold">Company progress</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{EXPLANATION}</p>
        </div>
        <StatusLegend />
      </header>

      <Kpis tasks={tasks} overview={overview} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">All work</h2>
          <p className="text-xs text-muted-foreground">Grouped for fast progress checks</p>
        </div>
        <ToggleGroup type="single" value={groupBy} onValueChange={(value) => value && setGroupBy(value as GroupBy)} variant="outline" size="sm">
          <ToggleGroupItem value="milestone">Milestone</ToggleGroupItem>
          <ToggleGroupItem value="department">Department</ToggleGroupItem>
          <ToggleGroupItem value="person">Person</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <TaskGroups tasks={tasks} overview={overview} groupBy={groupBy} onPanel={setPanel} />
      <CompanyPanel panel={panel} overview={overview} onPanel={setPanel} />
    </div>
  );
}

function Kpis({ tasks, overview }: { tasks: TaskSummary[]; overview: Overview | undefined }) {
  const done = overview?.by_status.done ?? 0;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const values = [
    ["Tasks", tasks.length],
    ["Done", `${pct}%`],
    ["In progress", overview?.by_status.in_progress ?? 0],
    ["In review", overview?.by_status.review ?? 0],
    ["Overdue", overview?.overdue ?? 0],
    ["Agent spend", money(overview?.cost?.total_usd ?? 0)],
  ];
  return (
    <div className="mt-5 grid grid-cols-2 divide-x divide-y overflow-hidden rounded-lg border bg-card sm:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
      {values.map(([label, value]) => (
        <div key={label} className="min-w-0 px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
          <p className={cn("mt-1 text-xl font-semibold tabular-nums", label === "Overdue" && Number(value) > 0 && "text-destructive")}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {STATUS_ORDER.map((status) => (
        <span key={status} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm", COMPANY_STATUS[status])} /> {STATUS_LABEL[status]}
        </span>
      ))}
    </div>
  );
}

function TaskGroups({ tasks, overview, groupBy, onPanel }: { tasks: TaskSummary[]; overview: Overview | undefined; groupBy: GroupBy; onPanel: (panel: Panel) => void }) {
  const groups = useMemo(() => {
    if (groupBy === "milestone") {
      return (overview?.milestones ?? []).map((m) => ({ id: m.id, name: m.name, tasks: tasks.filter((t) => t.milestone.id === m.id), person: undefined }));
    }
    if (groupBy === "department") {
      return [...new Set(tasks.flatMap((t) => t.departments))].sort().map((name) => ({ id: name, name, tasks: tasks.filter((t) => t.departments.includes(name)), person: undefined }));
    }
    const people = new Map<string, UserRef>();
    tasks.flatMap((t) => t.workers).forEach((person) => people.set(person.id, person));
    return [...people.values()].sort((a, b) => a.name.localeCompare(b.name)).map((person) => ({ id: person.id, name: person.name, tasks: tasks.filter((t) => t.workers.some((w) => w.id === person.id)), person }));
  }, [groupBy, overview?.milestones, tasks]);

  return (
    <div className="mt-3 overflow-hidden rounded-lg border bg-card">
      {groups.map((group) => {
        const done = group.tasks.filter((t) => t.status === "done").length;
        const pct = group.tasks.length ? Math.round((done / group.tasks.length) * 100) : 0;
        return (
          <section key={group.id} className="grid gap-3 border-b p-3 last:border-b-0 md:grid-cols-[190px_1fr]">
            <div className="min-w-0 self-center">
              {group.person ? (
                <Button variant="ghost" className="h-auto max-w-full justify-start px-1 py-0.5" onClick={() => onPanel({ kind: "person", user: group.person as UserRef })}>
                  <Avatar user={group.person} /> <span className="truncate">{group.name}</span>
                </Button>
              ) : <p className="truncate text-sm font-medium">{group.name}</p>}
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} /></div>
                <span className="text-[10px] tabular-nums text-muted-foreground">{pct}%</span>
              </div>
            </div>
            <div className="flex min-h-9 flex-wrap items-center gap-1.5">
              {ordered(group.tasks).map((task) => <TaskTile key={task.id} task={task} onClick={() => onPanel({ kind: "task", id: task.id })} />)}
              {!group.tasks.length ? <span className="text-xs text-muted-foreground">No tasks</span> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ordered(tasks: TaskSummary[]) {
  return [...tasks].sort((a, b) => {
    if (a.parent_id === b.id) return 1;
    if (b.parent_id === a.id) return -1;
    return (a.sequence ?? 999) - (b.sequence ?? 999);
  });
}

function TaskTile({ task, onClick }: { task: TaskSummary; onClick: () => void }) {
  const subtask = Boolean(task.parent_id);
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            onClick={onClick}
            aria-label={`Open ${task.id}: ${task.title}`}
            className={cn(
              "relative shrink-0 rounded-md p-0 font-mono text-[10px] font-bold shadow-none hover:brightness-95",
              subtask ? "size-5" : "size-9",
              COMPANY_STATUS[task.status],
              task.locked && "opacity-60",
              task.overdue && "ring-2 ring-company-overdue",
              task.live && "animate-live-pulse",
            )}
          >
            <span className={cn(subtask && "scale-75")}>{task.id}</span>
            {task.locked ? <Lock className="absolute right-0.5 top-0.5 size-2.5" /> : null}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64"><p className="font-medium">{task.id} · {task.title}</p><p className="opacity-80">{STATUS_LABEL[task.status]}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CompanyPanel({ panel, overview, onPanel }: { panel: Panel; overview: Overview | undefined; onPanel: (panel: Panel) => void }) {
  return (
    <Sheet open={panel !== null} onOpenChange={(open) => !open && onPanel(null)}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[420px]">
        {panel?.kind === "task" ? <TaskPanel id={panel.id} onPanel={onPanel} /> : null}
        {panel?.kind === "person" ? <PersonPanel user={panel.user} overview={overview} onPanel={onPanel} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function TaskPanel({ id, onPanel }: { id: string; onPanel: (panel: Panel) => void }) {
  const { data: task } = useQuery(companyTaskQuery(id));
  if (!task) return <SheetTitle>Loading task…</SheetTitle>;
  const people = uniquePeople([...task.workers, ...task.access]);
  return (
    <div className="space-y-6">
      <SheetHeader>
        <p className="font-mono text-xs text-muted-foreground">{task.id}</p>
        <SheetTitle className="pr-8">{task.title}</SheetTitle>
        <SheetDescription>Progress details only. Agent reports and prompts stay private.</SheetDescription>
      </SheetHeader>
      <div className="flex flex-wrap items-center gap-2"><StatusPill status={task.status} /><DueLabel due={task.due} overdue={task.overdue} />{task.locked ? <Chip><Lock className="mr-1 size-3" /> Locked</Chip> : null}</div>
      <PanelSection title="Departments"><div className="flex flex-wrap gap-1.5">{task.departments.map((d) => <Chip key={d}>{d}</Chip>)}</div></PanelSection>
      <PanelSection title="People">
        <div className="space-y-2">{people.map((person) => <Button key={person.id} variant="ghost" className="h-auto w-full justify-start px-2 py-1.5" onClick={() => onPanel({ kind: "person", user: person })}><Avatar user={person} /><span className="text-left"><span className="block text-sm font-medium">{person.name}</span><span className="block text-[11px] text-muted-foreground">{person.department}</span></span><RoleBadge className="ml-auto" role={person.role} short /></Button>)}</div>
      </PanelSection>
      <PanelSection title="Subtasks"><TaskLinks tasks={task.subtasks} onPanel={onPanel} empty="No subtasks" /></PanelSection>
      <PanelSection title="Dependencies"><TaskLinks tasks={task.depends_on} onPanel={onPanel} empty="No dependencies" /></PanelSection>
      <PanelSection title="Blocks"><TaskLinks tasks={task.blocks} onPanel={onPanel} empty="Doesn't block another task" /></PanelSection>
      {task.locked && task.blocked_by.length ? <PanelSection title="Waiting on"><TaskLinks tasks={task.blocked_by} onPanel={onPanel} /></PanelSection> : null}
      {task.sequence != null ? <p className="text-xs text-muted-foreground">Suggested sequence: {task.sequence}</p> : null}
    </div>
  );
}

function PersonPanel({ user, overview, onPanel }: { user: UserRef; overview: Overview | undefined; onPanel: (panel: Panel) => void }) {
  const { data: all = [] } = useQuery(companyTasksQuery({ person: user.id }));
  const { data: active = [] } = useQuery(companyTasksQuery({ person: user.id, status: "in_progress" }));
  const cost = overview?.cost?.by_person.find((row) => row.user.id === user.id);
  const counts = Object.fromEntries(STATUS_ORDER.map((status) => [status, all.filter((task) => task.status === status).length])) as Record<Status, number>;
  return (
    <div className="space-y-6">
      <SheetHeader>
        <div className="flex items-center gap-3"><Avatar user={user} size={42} /><div><SheetTitle>{user.name}</SheetTitle><SheetDescription>{user.department}</SheetDescription></div></div>
      </SheetHeader>
      <RoleBadge role={user.role} />
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
        <Metric label="Spend" value={money(cost?.cost_usd ?? 0)} />
        <Metric label="Tasks done" value={cost?.tasks_done ?? 0} />
      </div>
      <PanelSection title="Task status"><div className="grid grid-cols-2 gap-2">{STATUS_ORDER.map((status) => <div key={status} className="flex items-center justify-between rounded-md bg-muted px-2.5 py-2 text-xs"><span>{STATUS_LABEL[status]}</span><strong className="tabular-nums">{counts[status]}</strong></div>)}</div></PanelSection>
      <PanelSection title="In progress"><TaskLinks tasks={active} onPanel={onPanel} empty="No tasks in progress" tiles /></PanelSection>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="bg-card p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>; }
function PanelSection({ title, children }: { title: string; children: React.ReactNode }) { return <section><h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</h3>{children}</section>; }
function TaskLinks({ tasks, onPanel, empty, tiles = false }: { tasks: Pick<TaskSummary, "id" | "title" | "status">[]; onPanel: (panel: Panel) => void; empty?: string; tiles?: boolean }) {
  if (!tasks.length) return <p className="text-xs text-muted-foreground">{empty}</p>;
  return <div className="space-y-1.5">{tasks.map((task) => <Button key={task.id} variant="outline" className="h-auto w-full justify-start px-2.5 py-2 text-left" onClick={() => onPanel({ kind: "task", id: task.id })}><span className={cn("size-2 shrink-0 rounded-sm", COMPANY_STATUS[task.status])} /><span className={cn("font-mono text-[11px]", tiles && "font-semibold")}>{task.id}</span><span className="truncate text-xs font-normal">{task.title}</span></Button>)}</div>;
}
function uniquePeople(people: UserRef[]) { return [...new Map(people.map((person) => [person.id, person])).values()]; }
