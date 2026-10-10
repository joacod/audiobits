// Website metadata is separate from acoustic recipe data and bundled presets.
export const reactiveThrusterExperience = {
  title: "Reactive thruster",
  href: "/experiences/reactive-thruster",
  description: "Move to shape a living sound. Release to coast.",
  controls: ["Pointer velocity", "Throttle", "Impact"],
  relatedSounds: ["thruster", "impact"],
  sourceFiles: ["recipe.ts", "pointer.ts", "host.ts", "index.html"],
} as const;

export const energyChargeExperience = {
  title: "Energy charge",
  href: "/experiences/energy-charge",
  description: "Hold to build energy. Shape the sound with progress.",
  controls: ["Hold to charge", "Progress"],
  relatedSounds: [],
  sourceFiles: ["recipe.ts", "progress.ts", "host.ts", "index.html"],
} as const;
