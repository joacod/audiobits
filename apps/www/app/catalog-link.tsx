"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { prepareLightsaberNavigationAudio } from "../lib/lightsaber-navigation-audio";

export function CatalogLink(
  props: Omit<ComponentProps<typeof Link>, "onNavigate">,
) {
  return (
    <Link
      {...props}
      // Next calls this only for navigation in this tab, excluding downloads
      // and modified clicks. The engine must start before the route transition.
      onNavigate={() => {
        if (props.href === "/catalog/lightsaber")
          prepareLightsaberNavigationAudio();
      }}
    />
  );
}
