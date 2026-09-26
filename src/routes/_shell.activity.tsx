import { createFileRoute } from "@tanstack/react-router";

import { StepPlaceholder } from "@/components/step-placeholder";

export const Route = createFileRoute("/_shell/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Orchestra" },
      { name: "description", content: "Live feed of progress reported by every agent on the project." },
      { property: "og:title", content: "Activity — Orchestra" },
      { property: "og:description", content: "Live feed of progress reported by every agent on the project." },
    ],
  }),
  component: () => <StepPlaceholder title="Activity" step="step 5" />,
});
