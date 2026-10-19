"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { prepareExperienceNavigationAudio } from "../lib/experience-audio";

export function ExperienceLink(
  props: Omit<ComponentProps<typeof Link>, "onNavigate">,
) {
  return (
    <Link
      {...props}
      // Next calls this only for navigation in this tab, excluding downloads
      // and modified clicks. The engine must start before the route transition.
      onNavigate={() => {
        if (typeof props.href === "string")
          prepareExperienceNavigationAudio(props.href);
      }}
    />
  );
}
