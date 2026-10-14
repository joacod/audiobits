import {
  echoProbe,
  probeReflection,
  probeDiffusion,
} from "../../catalog/experiences/echo-probe/recipe";
import { compile } from "../../packages/audiobits/src/compiler/plan";
import { createGraph } from "../../packages/audiobits/src/compiler/graph";
import { createAudio } from "audiobits";
import { createEchoProbe } from "../../catalog/experiences/echo-probe/controller";
import { thruster } from "../../catalog/recipes/thruster/recipe";

/** Native acoustic bench used before presentation work and for regression evidence. */
async function probeSignal(
  kind: "emission" | "reflection" | "diffusion",
  surface = 0.5,
  pan = 0,
  gainDb = 0,
  seed = 42,
  count = 1,
  rate = 48000,
) {
  const recipe =
    kind === "emission"
      ? echoProbe
      : kind === "reflection"
        ? probeReflection
        : probeDiffusion;
  const context = new OfflineAudioContext(2, rate, rate);
  const master = context.createGain();
  master.gain.value = 10 ** (-12 / 20);
  master.connect(context.destination);
  for (let index = 0; index < count; index++)
    createGraph(
      context,
      master,
      compile(recipe, kind === "emission" ? {} : { surface }, seed),
      0.02,
      gainDb,
      pan,
      () => {},
    );
  const buffer = await context.startRendering();
  let peak = 0,
    energy = 0,
    left = 0,
    right = 0,
    slope = 0,
    tail = 0,
    onset = -1;
  const a = buffer.getChannelData(0),
    b = buffer.getChannelData(1);
  for (let index = 0; index < a.length; index++) {
    if (!Number.isFinite(a[index]) || !Number.isFinite(b[index]))
      throw new Error("Nonfinite Echo Probe sample");
    const power = a[index] ** 2 + b[index] ** 2;
    peak = Math.max(peak, Math.abs(a[index]), Math.abs(b[index]));
    energy += power;
    left += a[index] ** 2;
    right += b[index] ** 2;
    if (index)
      slope += (a[index] - a[index - 1]) ** 2 + (b[index] - b[index - 1]) ** 2;
    if (index > rate * 0.8)
      tail = Math.max(tail, Math.abs(a[index]), Math.abs(b[index]));
    if (onset < 0 && power > 1e-12) onset = index / rate;
  }
  return { peak, energy, left, right, brightness: slope / energy, tail, onset };
}
async function probeResources() {
  const audio = createAudio({ maxVoices: 32, maxVoicesPerSound: 16 });
  const probe = createEchoProbe(audio);
  const otherSound = audio.sound(thruster);
  await audio.start();
  const other = otherSound.play({ gainDb: -60 });
  let maximum = 0;
  const walls = Array.from({ length: 6 }, (_, index) => ({
    distance: index / 5,
    pan: index / 2.5 - 1,
    intensity: 1,
    surface: index / 5,
  }));
  for (let index = 0; index < 100; index++) {
    const emission = probe.emit(walls, { seed: index });
    if (!emission)
      throw new Error("Burst was incorrectly rejected after cleanup");
    maximum = Math.max(maximum, audio.counts.active);
    probe.stop();
    await emission.ended;
    if (audio.counts.active !== 1 || probe.active !== 0)
      throw new Error("Cancelled returns retained resources");
  }
  probe.emit(walls);
  probe.dispose();
  if (other.state !== "active" || audio.counts.active !== 1)
    throw new Error("Controller disposal touched shared audio");
  otherSound.dispose();
  await audio.dispose();
  return { maximum, emissions: 100, counts: audio.counts, state: audio.state };
}
Object.assign(globalThis, { probeSignal, probeResources });
