import { useQuery } from "@tanstack/react-query";
import { Bot, Moon, Sun } from "lucide-react";

import { Logo } from "@/components/logo";
import { SourcePill } from "@/components/source-pill";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/use-theme";
import { overviewQuery } from "@/lib/queries";
import type { Me } from "@/lib/types";

import { LiveAgentsList, useActiveAgentCount } from "./live-agents";
import { UserMenu } from "./user-menu";

function MilestoneStrip() {
  const { data } = useQuery(overviewQuery());
  if (!data) return null;
  return (
    <div className="hidden items-center gap-4 lg:flex">
      {data.milestones.map((m) => (
        <div key={m.id} className="w-32" title={`${m.name} · due ${m.due} · ${m.done}/${m.total} done`}>
          <div className="flex justify-between text-[11px]">
            <span className="truncate text-muted-foreground">{m.name}</span>
            <span className="font-medium tabular-nums">{m.pct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${m.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopBar({ me }: { me: Me }) {
  const { theme, toggle } = useTheme();
  const active = useActiveAgentCount();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-card px-4">
      <div className="flex items-center gap-2.5">
        <Logo size={28} />
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Orchestra</p>
          <p className="max-w-48 truncate text-[11px] text-muted-foreground">{me.project.name}</p>
        </div>
      </div>
      <div className="mx-auto">
        <MilestoneStrip />
      </div>
      <div className="flex items-center gap-2">
        <SourcePill />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="relative min-[1440px]:hidden" aria-label="Live agents">
              <Bot className="size-4" />
              {active > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-agent text-[10px] font-semibold text-agent-foreground">
                  {active}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0">
            <SheetTitle className="sr-only">Live agents</SheetTitle>
            <LiveAgentsList />
          </SheetContent>
        </Sheet>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <UserMenu me={me} />
      </div>
    </header>
  );
}
