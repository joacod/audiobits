"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { prepareExperienceNavigationAudio } from "../lib/experience-audio";

export function ExperienceLink(
  props: Omit<ComponentProps<typeof Link>, "onNavigate">,
) {
  return (
    <Link
      // Visible catalog/navigation links must not fetch unrelated renderers.
      // The accepted navigation gesture still prepares audio synchronously.
      prefetch={false}
      {...props}
      // Next calls this only for navigation in this tab, excluding downloads
      // and modified clicks. The engine must start before the route transition.
      onNavigate={() => {
        const destination =
          typeof props.href === "string" ? props.href : props.href.pathname;
        if (destination) prepareExperienceNavigationAudio(destination);
      }}
    />
  );
}
