import { experienceSourceFiles, registryItem } from "./registry";

// Website metadata is separate from acoustic recipe data and catalog recipes.
export const reactiveThrusterExperience = {
  title: registryItem("reactive-thruster").title,
  href: "/catalog/reactive-thruster",
  description: registryItem("reactive-thruster").description,
  controls: ["Pointer velocity", "Throttle", "Impact"],
  relatedSounds: ["thruster", "impact"],
  sourceFiles: experienceSourceFiles("reactive-thruster").map(
    (file) => file.name,
  ),
} as const;

export const energyChargeExperience = {
  title: registryItem("energy-charge").title,
  href: "/catalog/energy-charge",
  description: registryItem("energy-charge").description,
  controls: ["Hold to charge", "Progress"],
  relatedSounds: [],
  sourceFiles: experienceSourceFiles("energy-charge").map((file) => file.name),
} as const;

export const experienceSourcePurpose = {
  "energy-charge": {
    "recipe.ts":
      "Sustained energy field. Schema-1 data with a live charge parameter. Independent copy-in source you own.",
    "progress.ts":
      "Progress controller with no DOM and no timer. The application supplies charge, release, and cancellation.",
    "host.ts":
      "Browser policy around that controller: gesture start, hide, blur, pagehide, and dispose.",
    "index.html":
      "Standalone page that wires the host to Start, Release, Stop all, Mute, and a range input.",
  },
  "reactive-thruster": {
    "../../recipes/impact/recipe.ts":
      "Canonical Impact recipe used by the host. Keep this relative path when copying the complete experience.",
    "recipe.ts":
      "Motor, turbine, and exhaust. Schema-1 data with a live throttle parameter. Separate from the simpler catalog Thruster recipe.",
    "pointer.ts":
      "Turns pointer velocity into throttle. Full thrust is 1200 px/s. Owns capture, release, and cancellation on the play surface.",
    "host.ts":
      "Shared engine for the thruster and canonical impact, plus hide, blur, pagehide, and dispose.",
    "index.html":
      "Standalone page with the pad, throttle, impact, Mute, and Stop all. Pointer capture stays on the pad.",
  },
} as const;
