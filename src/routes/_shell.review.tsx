import { createFileRoute } from "@tanstack/react-router";

import { StepPlaceholder } from "@/components/step-placeholder";

export const Route = createFileRoute("/_shell/review")({
  head: () => ({
    meta: [
      { title: "Review — Orchestra" },
      { name: "description", content: "Tasks waiting for approval from a senior or project manager." },
      { property: "og:title", content: "Review — Orchestra" },
      { property: "og:description", content: "Tasks waiting for approval from a senior or project manager." },
    ],
  }),
  component: () => <StepPlaceholder title="Review" step="step 7" />,
});
