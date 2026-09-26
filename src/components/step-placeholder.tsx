import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import { RoleBadge } from "@/components/role-badge";
import { SourcePill } from "@/components/source-pill";
import { Button } from "@/components/ui/button";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useSourceMonitor } from "@/hooks/use-data-source";
import { api, clearToken } from "@/lib/api";

/**
 * Temporary page body used while the app is built step by step.
 * Replaced by the real screen in the step named below.
 */
export function StepPlaceholder({ title, step }: { title: string; step: string }) {
  const { me } = useAuthGuard();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useSourceMonitor();

  async function signOut() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    clearToken();
    await navigate({ to: "/login", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">Orchestra</p>
            <p className="text-xs text-muted-foreground">{me?.project.name ?? "Loading project…"}</p>
          </div>
        </div>
        <SourcePill />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-card">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This screen arrives in {step}. Session handling is live already.
        </p>

        {me ? (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-surface p-3">
              <dt className="text-xs text-muted-foreground">Signed in as</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium">
                {me.user.name} <RoleBadge role={me.user.role} short />
              </dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {me.user.title} · {me.user.department}
              </dd>
            </div>
            <div className="rounded-lg border bg-surface p-3">
              <dt className="text-xs text-muted-foreground">Capabilities from the server</dt>
              <dd className="mt-1 text-xs text-muted-foreground">
                graph: {String(me.capabilities.graph)} · review: {String(me.capabilities.review)} · cost:{" "}
                {String(me.capabilities.cost)}
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-6 flex gap-2">
          <Button variant="outline" onClick={() => void signOut()}>
            Log out
          </Button>
        </div>
      </div>
    </main>
  );
}
