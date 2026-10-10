// Website metadata is separate from acoustic recipe data and bundled presets.
export const reactiveThrusterExperience = {
  title: "Reactive thruster",
  href: "/experiences/reactive-thruster",
  description: "Move to shape a living sound. Release to coast.",
  controls: ["Pointer velocity", "Throttle", "Impact"],
  relatedSounds: ["thruster", "impact"],
  sourceFiles: ["recipe.ts", "pointer.ts", "host.ts", "index.html"],
} as const;
