import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  rm,
  stat,
  mkdir,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const require = createRequire(
  new URL("../packages/audiobits/package.json", import.meta.url),
);
const { build } = await import(require.resolve("tsdown"));
const evidence = { examples: [], browser: [], treeShaking: false };

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
    outputFiles.length !== 8 ||
    emitted.some((file) => !outputFiles.includes(file) && file !== "recipes")
  )
    throw new Error("Unexpected build output");
  const allowed = new Set([
    "package/package.json",
    "package/README.md",
    "package/LICENSE",
    "package/CHANGELOG.md",
    "package/skill/SKILL.md",
    "package/skill/references/controls.md",
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
  await writeFile(
    join(consumer, "authoring.types.ts"),
    (await readFile("packages/audiobits/tests/authoring.types.ts", "utf8"))
      .replaceAll("../src/recipes/index", "audiobits/recipes")
      .replaceAll("../src/index", "audiobits"),
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
      "authoring.types.ts",
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
    const recipes = await import('audiobits/recipes');
    const { default: schema } = await import('audiobits/schema.json', { with: { type: 'json' } });
    const { default: capabilities } = await import('audiobits/capabilities.json', { with: { type: 'json' } });
    assert.deepEqual(Object.keys(recipes).sort(), capabilities.curatedRecipes.toSorted());
    assert.equal(capabilities.schemaVersion, schema.$defs.OneShotRecipe.properties.schemaVersion.const);
    for (const recipe of Object.values(recipes)) assert.ok(validateRecipe(recipe).ok);
    const audio = createAudio();
    for (const recipe of Object.values(recipes)) audio.sound(defineSound(recipe));
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

  const installed = join(consumer, "node_modules/audiobits");
  const schemaPath = manifest.exports["./schema.json"];
  const capabilityPath = manifest.exports["./capabilities.json"];
  const schema = JSON.parse(
    await readFile(join(installed, schemaPath), "utf8"),
  );
  const capabilities = JSON.parse(
    await readFile(join(installed, capabilityPath), "utf8"),
  );
  assert.equal(capabilities.packageVersion, manifest.version);
  assert.equal(
    capabilities.schemaVersion,
    schema.$defs.OneShotRecipe.properties.schemaVersion.const,
  );
  assert.equal(capabilities.status, "unreleased");
  // Inspect all archive text, not just the runtime entry. No maps or source files are shipped.
  for (const file of files) {
    const content = await readFile(
      join(installed, file.slice("package/".length)),
      "utf8",
    );
    assert.ok(
      !content.includes(root) && !content.includes(consumer),
      `Private build path in ${file}`,
    );
    assert.ok(
      !/\/(?:Users|home)\/[^\s"']+|[A-Z]:\\Users\\|-----BEGIN .*PRIVATE KEY-----|(?:ghp_|github_pat_)[A-Za-z0-9_]+/.test(
        content,
      ),
      `Nonpublic content in ${file}`,
    );
  }
  assert.equal(
    await readFile(join(installed, "LICENSE"), "utf8"),
    await readFile(resolve("LICENSE"), "utf8"),
  );
  const examples = [];
  for (const file of ["README.md", "skill/references/controls.md"]) {
    const content = await readFile(join(installed, file), "utf8");
    for (const [index, match] of [
      ...content.matchAll(/```ts\n([\s\S]*?)```/g),
    ].entries()) {
      const name = `example-${examples.length}`;
      await writeFile(join(consumer, `${name}.ts`), match[1]);
      examples.push({ name, file, index, code: match[1] });
    }
  }
  assert.equal(examples.length, 6, "Review any new documentation example");
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
      ...examples.map(({ name }) => `${name}.ts`),
    ],
    consumer,
  );
  evidence.examples = examples.map(({ file, index }) => ({
    file,
    index,
    typecheck: "passed",
  }));
  const browserOutput = join(consumer, "browser");
  await mkdir(browserOutput);
  for (const name of ["baseline", "unused"]) {
    await writeFile(
      join(consumer, `${name}.ts`),
      `${name === "unused" ? 'import { createAudio } from "audiobits";\n' : ""}console.log("tree-shaken");`,
    );
    await build({
      entry: [join(consumer, `${name}.ts`)],
      format: "esm",
      platform: "browser",
      target: "es2022",
      outDir: browserOutput,
      dts: false,
      clean: false,
      minify: true,
    });
  }
  assert.equal(
    await readFile(join(browserOutput, "unused.js"), "utf8"),
    await readFile(join(browserOutput, "baseline.js"), "utf8"),
    "Unused runtime import must fully tree-shake",
  );
  evidence.treeShaking = true;
  // Execute exact packaged host examples, adding only caller-owned signal probes.
  for (const example of examples.filter(
    ({ file, index }) => file !== "README.md" || index <= 1,
  )) {
    await writeFile(
      join(consumer, `${example.name}-browser.ts`),
      `${example.code}
let context: AudioContext | undefined;
let analyser: AnalyserNode | undefined;
let detach: (() => void) | undefined;
const probe = {
  play,
  stop,
  async dispose() { detach?.(); analyser?.disconnect(); await dispose(); },
  measure() {
    context ??= audio.native.context;
    analyser ??= context.createAnalyser();
    detach ??= audio.native.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    return Math.max(...samples.map(Math.abs));
  },
  get state() { return audio.state; },
  get counts() { return audio.counts; },
  get contextState() { return context?.state; },
  ${example.file === "README.md" ? "" : "setThrottle,"}
};
Object.assign(globalThis, { probe });`,
    );
    await build({
      entry: [join(consumer, `${example.name}-browser.ts`)],
      format: "iife",
      globalName: "candidateExample",
      platform: "browser",
      target: "es2022",
      outDir: browserOutput,
      dts: false,
      clean: false,
    });
  }
  const server = createServer(async (request, response) => {
    const name = request.url?.slice(1);
    if (name && /^[a-z0-9.-]+\.js$/.test(name)) {
      response.setHeader("Content-Type", "text/javascript");
      response.end(await readFile(join(browserOutput, name)));
    } else {
      response.setHeader("Content-Type", "text/html");
      response.end(
        '<button id="play">Play</button><button id="stop">Stop</button><button id="dispose">Dispose</button>',
      );
    }
  });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    browser = await chromium.launch();
    evidence.chromium = browser.version();
    for (const example of examples.filter(
      ({ file, index }) => file !== "README.md" || index <= 1,
    )) {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.evaluate(() => {
        globalThis.contextCount = 0;
        const NativeContext = globalThis.AudioContext;
        globalThis.AudioContext = class extends NativeContext {
          constructor(...args) {
            super(...args);
            globalThis.contextCount++;
          }
        };
      });
      await page.addScriptTag({ url: `/${example.name}-browser.iife.js` });
      assert.equal(
        await page.evaluate(() => globalThis.contextCount),
        0,
        "No context on load",
      );
      await page.evaluate(() => {
        globalThis.document.querySelector("#play").onclick = () => {
          globalThis.playing = globalThis.probe.play();
        };
        globalThis.document.querySelector("#stop").onclick = () =>
          globalThis.probe.stop();
        globalThis.document.querySelector("#dispose").onclick = () => {
          globalThis.disposing = globalThis.probe.dispose();
        };
      });
      await page.click("#play");
      await page.evaluate(() => globalThis.playing);
      assert.equal(await page.evaluate(() => globalThis.contextCount), 1);
      const peak = await page.evaluate(async () => {
        let peak = 0;
        for (let i = 0; i < 20; i++) {
          peak = Math.max(peak, globalThis.probe.measure());
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
        globalThis.probe.setThrottle?.(0.8);
        return peak;
      });
      assert.ok(
        Number.isFinite(peak) && peak > 0,
        "Native signal must be nonzero and finite",
      );
      await page.click("#stop");
      await page.waitForTimeout(400);
      assert.equal(
        await page.evaluate(() => globalThis.probe.measure()),
        0,
        "Stop must clear signal/tails",
      );
      assert.deepEqual(await page.evaluate(() => globalThis.probe.counts), {
        active: 0,
        retiring: 0,
      });
      await page.click("#dispose");
      await page.evaluate(() => globalThis.disposing);
      assert.equal(
        await page.evaluate(() => globalThis.probe.state),
        "disposed",
      );
      assert.equal(
        await page.evaluate(() => globalThis.probe.contextState),
        "closed",
      );
      assert.deepEqual(errors, []);
      evidence.browser.push({
        file: example.file,
        index: example.index,
        peak,
        silentLoad: true,
        closed: true,
      });
      await page.close();
    }
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
  const retained = resolve("node_modules/.cache/audiobits-release");
  await mkdir(retained, { recursive: true });
  const archiveName = `audiobits-${manifest.version}.tgz`;
  await copyFile(archive, join(retained, archiveName));
  evidence.archive = archiveName;
  evidence.version = manifest.version;
  evidence.sha256 = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  evidence.bytes = (await stat(archive)).size;
  evidence.files = files;
  evidence.node = process.version;
  evidence.sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  evidence.dirtySource = Boolean(
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  );
  await writeFile(
    join(retained, "evidence.json"),
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence, null, 2));
  console.log(
    "Package contents, metadata, zero dependencies, isolated types/Node/Chromium and tree-shaking passed.",
  );
  console.log(
    "Package allowlist, zero runtime dependencies, declarations, and SSR import passed.",
  );
} finally {
  await rm(consumer, { recursive: true, force: true });
}
