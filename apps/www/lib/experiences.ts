// Website metadata is separate from acoustic recipe data and bundled presets.
export const reactiveThrusterExperience = {
  title: "Reactive thruster",
  href: "/catalog/reactive-thruster",
  description: "Move to shape a living sound. Release to coast.",
  controls: ["Pointer velocity", "Throttle", "Impact"],
  relatedSounds: ["thruster", "impact"],
  sourceFiles: ["recipe.ts", "pointer.ts", "host.ts", "index.html"],
} as const;

export const energyChargeExperience = {
  title: "Energy charge",
  href: "/catalog/energy-charge",
  description: "Hold to build energy. Shape the sound with progress.",
  controls: ["Hold to charge", "Progress"],
  relatedSounds: [],
  sourceFiles: ["recipe.ts", "progress.ts", "host.ts", "index.html"],
} as const;

export const experienceSourcePurpose = {
  "energy-charge": {
    "recipe.ts":
      "Sustained energy field. Schema-1 data with a live charge parameter. Independent copy-in source, not an audiobits/recipes export.",
    "progress.ts":
      "Progress controller with no DOM and no timer. The application supplies charge, release, and cancellation.",
    "host.ts":
      "Browser policy around that controller: gesture start, hide, blur, pagehide, and dispose.",
    "index.html":
      "Standalone page that wires the host to Start, Release, Stop all, Mute, and a range input.",
  },
  "reactive-thruster": {
    "recipe.ts":
      "Motor, turbine, and exhaust. Schema-1 data with a live throttle parameter. Separate from the bundled thruster preset.",
    "pointer.ts":
      "Turns pointer velocity into throttle. Full thrust is 1200 px/s. Owns capture, release, and cancellation on the play surface.",
    "host.ts":
      "Shared engine for the thruster and bundled impact, plus hide, blur, pagehide, and dispose.",
    "index.html":
      "Standalone page with the pad, throttle, impact, Mute, and Stop all. Pointer capture stays on the pad.",
  },
} as const;
