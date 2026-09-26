import { createFileRoute } from "@tanstack/react-router";

import { StepPlaceholder } from "@/components/step-placeholder";

export const Route = createFileRoute("/_shell/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge — Orchestra" },
      { name: "description", content: "Project knowledge base written by the team and their agents." },
      { property: "og:title", content: "Knowledge — Orchestra" },
      { property: "og:description", content: "Project knowledge base written by the team and their agents." },
    ],
  }),
  component: () => <StepPlaceholder title="Knowledge" step="step 6" />,
});
