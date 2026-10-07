import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (command, args, cwd = root) =>
  execFileSync(command, args, { cwd, stdio: "inherit" });
const consumer = await mkdtemp(join(tmpdir(), "audiobits-package-"));
try {
  run(pnpm, ["exec", "publint", "packages/audiobits", "--strict"]);
  run(pnpm, ["--filter", "audiobits", "pack", "--pack-destination", consumer]);
  const archive = join(
    consumer,
    (await readdir(consumer)).find((file) => file.endsWith(".tgz")),
  );
  console.log(`Packed archive size: ${(await stat(archive)).size} bytes.`);
  const files = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim()
    .split("\n");
  const emitted = await readdir(resolve("packages/audiobits/dist"), {
    recursive: true,
  });
  const outputFiles = emitted.filter((file) => /\.(js|d\.ts|json)$/.test(file));
  if (
    outputFiles.length !== 7 ||
    emitted.some((file) => !outputFiles.includes(file) && file !== "recipes")
  )
    throw new Error("Unexpected build output");
  const allowed = new Set([
    "package/package.json",
    "package/README.md",
    "package/LICENSE",
    ...outputFiles.map((file) => `package/dist/${file}`),
  ]);
  if (files.length !== allowed.size || files.some((file) => !allowed.has(file)))
    throw new Error(`Unexpected package files: ${files.join(", ")}`);
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({
      name: "isolated-consumer",
      private: true,
      type: "module",
    }),
  );
  // npm in a system temporary directory cannot resolve workspace:* or root sources.
  run(
    npm,
    [
      "install",
      archive,
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      join(consumer, "cache"),
    ],
    consumer,
  );
  await writeFile(
    join(consumer, "index.ts"),
    'import { workspaceStatus, createAudio, defineSound, validateRecipe } from "audiobits"; import { confirmation, impact, thruster } from "audiobits/recipes"; const status: string = workspaceStatus; const audio = createAudio(); const recipe = defineSound(confirmation); audio.sound(recipe); const dynamic = () => { const voice = audio.sound(thruster).play({ seed: 42, parameters: { throttle: 0.2 } }); voice.set({ throttle: 1 }); const bus = audio.bus("effects"); bus.setDelay({ seconds: 0.2, feedback: 0.5, wet: 0.3 }); bus.setGainDb(-6, 0.1); bus.setMuted(true); bus.setParent(audio.master); audio.sound(impact).play({ bus }); const analyser = audio.native.context.createAnalyser(); const detach = audio.native.connect(analyser); detach(); analyser.disconnect(); audio.stopAll({ tails: "cut" }); bus.dispose(); const seed: number = voice.seed; audio.sound(impact).play({ parameters: { intensity: 1 }, seed }); voice.stop(); }; void dynamic; console.log(status, validateRecipe(recipe)); void audio.dispose();\n',
  );
  run(
    process.execPath,
    [
      resolve("node_modules/typescript/bin/tsc"),
      "--noEmit",
      "--strict",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--target",
      "ES2022",
      "index.ts",
    ],
    consumer,
  );
  run(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    assert.equal(typeof window, 'undefined');
    assert.equal(typeof AudioContext, 'undefined');
    const { workspaceStatus, createAudio, defineSound, validateRecipe } = await import('audiobits');
    const { confirmation, impact, thruster } = await import('audiobits/recipes');
    for (const recipe of [confirmation, impact, thruster]) assert.ok(validateRecipe(recipe).ok);
    const audio = createAudio();
    for (const recipe of [confirmation, impact, thruster]) audio.sound(defineSound(recipe));
    assert.equal(audio.state, 'idle');
    await audio.dispose();
    assert.equal(workspaceStatus, 'AudioBits workspace ready');
    assert.ok(import.meta.resolve('audiobits').startsWith(new URL('./node_modules/', import.meta.url).href));
    console.log('Isolated Node import and exported value passed.');
  `,
    ],
    consumer,
  );
  const manifest = JSON.parse(
    await readFile(
      join(consumer, "node_modules/audiobits/package.json"),
      "utf8",
    ),
  );
  if (!manifest.private || manifest.dependencies || manifest.peerDependencies)
    throw new Error(
      "Runtime must remain private with zero runtime dependencies",
    );
  const output = await readFile(
    join(consumer, "node_modules/audiobits/dist/index.js"),
    "utf8",
  );
  if (
    output.includes(root) ||
    output.includes(consumer) ||
    /sourceMappingURL/.test(output)
  )
    throw new Error("Nonportable package output");
  console.log(
    "Package allowlist, zero runtime dependencies, declarations, and SSR import passed.",
  );
} finally {
  await rm(consumer, { recursive: true, force: true });
}
