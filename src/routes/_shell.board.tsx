import { createFileRoute } from "@tanstack/react-router";

import { StepPlaceholder } from "@/components/step-placeholder";

export const Route = createFileRoute("/_shell/board")({
  head: () => ({
    meta: [
      { title: "Board — Orchestra" },
      { name: "description", content: "Kanban board of every task your agents are working on." },
      { property: "og:title", content: "Board — Orchestra" },
      { property: "og:description", content: "Kanban board of every task your agents are working on." },
    ],
  }),
  component: () => <StepPlaceholder title="Board" step="step 3" />,
});
