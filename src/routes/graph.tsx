import { createFileRoute } from "@tanstack/react-router";

import { StepPlaceholder } from "@/components/step-placeholder";

export const Route = createFileRoute("/graph")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Project graph — Orchestra" },
      {
        name: "description",
        content: "Relational graph of milestones, tasks and the people working together.",
      },
      { property: "og:title", content: "Project graph — Orchestra" },
      {
        property: "og:description",
        content: "Relational graph of milestones, tasks and the people working together.",
      },
    ],
  }),
  component: () => <StepPlaceholder title="Project graph" step="step 8" />,
});
