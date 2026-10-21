import { registryItem } from "./registry";

export const experienceSourcePurpose = {
  "echo-probe": {
    "recipe.ts":
      "Emission, preserved returns, independent material/propagation filters, and native late repeats as schema-1 data.",
    "controller.ts":
      "Audio-clock scheduling, bounded application reflections, seeded emissions, and owned cancellation.",
    "host.ts":
      "Gesture activation, retry, interruption, hide, blur, Stop, and disposal.",
    "index.html":
      "Resynthesis/native/hybrid audition, remembered comparisons, and rapid live emission bench.",
    "bench.ts":
      "Development-only public recipe comparison, return-energy matching, and native delay resource measurements.",
    "baseline.ts":
      "Original PR #100 acoustic definitions, preserved for listening review.",
    "baseline-controller.ts":
      "Original PR #100 scheduling and acoustic mapping for reference A.",
  },
  "the-rift": {
    "recipe.ts":
      "Sustained fracture field plus opening, disturbance, collapse and implosion recipes as schema-1 data.",
    "controller.ts":
      "Phase transitions, live shape updates, autonomous evolution on the audio clock, and owned cleanup.",
    "host.ts":
      "Gesture activation, pending opening intent, hide, blur, Stop, and disposal.",
    "index.html":
      "Standalone acoustic bench with Open, Collapse, Stop and shape sliders.",
  },
  "riff-reactor": {
    "recipe.ts":
      "Kick, snare, hats, bass, pad, arpeggio, chugs, riser, crash, a sustained lead and a choke as schema-1 data.",
    "song.ts":
      "Reactor Core: tempo, bars and every band and lead note in beats, each band event tagged with an intensity tier.",
    "controller.ts":
      "One audio-clock transport, lookahead band scheduling, bar-line intensity, monophonic lead performance and owned cleanup.",
    "host.ts":
      "Gesture activation, restart, hide, pagehide, Stop, and disposal.",
    "index.html":
      "Standalone band bench with Play, Stop, Perform, Choke and intensity.",
  },
  lightsaber: {
    "recipe.ts":
      "Five original schema-1 recipes: hum, ignition, swing, clash, and retraction.",
    "motion.ts":
      "Showcase CSS-pixel speed mapping and segment collision geometry.",
    "controller.ts":
      "DOM-free voice ownership, live modulation, swing hysteresis, and impact cooldowns.",
    "host.ts":
      "Gesture activation, bounded engine, Mute, Stop, hide, blur, and disposal.",
    "stage.ts":
      "Portable canvas stage with mouse, touch, keyboard, swept collisions, trails, sparks, and measured output.",
    "index.html":
      "Standalone demo using the same host and canvas stage as this page.",
  },
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
    "recipe.ts":
      "Motor, turbine, and exhaust. Schema-1 data with a live throttle parameter. Separate from the simpler catalog Thruster recipe.",
    "pointer.ts":
      "Sound controller accepting application throttle, with no DOM, input handlers, or frames.",
    "host.ts":
      "Shared engine for the thruster and canonical impact, plus hide, blur, pagehide, and dispose.",
    "index.html":
      "Standalone page with the pad, throttle, impact, Mute, and Stop all. Pointer capture stays on the pad.",
    "../../recipes/impact/recipe.ts":
      "Canonical Impact recipe used by the host. Keep this relative path when copying the complete experience.",
  },
} as const;

// Website metadata is separate from acoustic recipe data and catalog recipes.
export const reactiveThrusterExperience = {
  title: registryItem("reactive-thruster").title,
  href: "/catalog/reactive-thruster",
  description: registryItem("reactive-thruster").description,
  controls: ["Pointer velocity", "Throttle", "Impact"],
  sourceFiles: experienceDemoSourceFiles("reactive-thruster").map(
    (file) => file.name,
  ),
} as const;

export const energyChargeExperience = {
  title: registryItem("energy-charge").title,
  href: "/catalog/energy-charge",
  description: registryItem("energy-charge").description,
  controls: ["Hold to charge", "Progress"],
  sourceFiles: experienceDemoSourceFiles("energy-charge").map(
    (file) => file.name,
  ),
} as const;

export const lightsaberExperience = {
  title: registryItem("lightsaber").title,
  href: "/catalog/lightsaber",
  description: registryItem("lightsaber").description,
  controls: ["Ignite", "Motion", "Strike", "Retract"],
  sourceFiles: experienceDemoSourceFiles("lightsaber").map((file) => file.name),
} as const;

// Presentation source stays browsable without becoming an installation manifest.
export function experienceDemoSourceFiles(
  id: keyof typeof experienceSourcePurpose,
) {
  return Object.keys(experienceSourcePurpose[id]).map((name) => ({
    name,
    path: `catalog/experiences/${id}/${name}`,
  }));
}

export const riftExperience = {
  title: registryItem("the-rift").title,
  href: "/catalog/the-rift",
  description: registryItem("the-rift").description,
  controls: ["Tear open", "Aperture", "Tension", "Instability", "Seal"],
  sourceFiles: experienceDemoSourceFiles("the-rift").map((file) => file.name),
} as const;

export const riffReactorExperience = {
  title: registryItem("riff-reactor").title,
  href: "/catalog/riff-reactor",
  description: registryItem("riff-reactor").description,
  controls: ["Play", "Three lanes", "Streak", "Intensity", "Stop"],
  sourceFiles: experienceDemoSourceFiles("riff-reactor").map(
    (file) => file.name,
  ),
} as const;

export const echoProbeExperience = {
  title: registryItem("echo-probe").title,
  href: "/catalog/echo-probe",
  description: registryItem("echo-probe").description,
  controls: ["Emit", "Distance", "Direction", "Surface"],
  sourceFiles: experienceDemoSourceFiles("echo-probe").map((file) => file.name),
} as const;
