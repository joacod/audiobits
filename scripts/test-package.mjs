import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { execFileSync, spawn } from "node:child_process";
import {
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  rm,
  stat,
  mkdir,
  copyFile,
  cp,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
const root = process.cwd();
const args = process.argv.slice(2);
const github = args.includes("--github");
const latest = args.includes("--latest");
const revision = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const requestedRevision = args
  .find((arg) => arg.startsWith("--revision="))
  ?.slice(11);
assert.ok(
  args.every(
    (arg) =>
      arg === "--github" || arg === "--latest" || arg.startsWith("--revision="),
  ),
  "Unknown package verification argument",
);
const dirtySource = Boolean(
  execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
);
if (github) {
  assert.match(
    requestedRevision ?? "",
    /^[a-f0-9]{40}$/,
    "GitHub installation requires --revision=<full commit SHA>",
  );
  assert.equal(
    requestedRevision,
    revision,
    "GitHub revision must match the checkout being verified",
  );
  assert.equal(
    dirtySource,
    false,
    "GitHub installation requires a clean checkout",
  );
} else {
  assert.equal(
    requestedRevision,
    undefined,
    "--revision is only used with --github",
  );
}
// Reject invalid invocations before loading consumer/build dependencies.
const { default: ts } = await import("typescript");
const { chromium, expect } = await import("@playwright/test");
const { libraryExample, parametersFor, quickExample, sounds } =
  await import("../apps/www/lib/gallery.ts");
const { experienceExample } =
  await import("../apps/www/lib/experience-example.ts");
const require = createRequire(
  new URL("../packages/audiobits/package.json", import.meta.url),
);
const { build } = await import(require.resolve("tsdown"));
const evidence = { examples: [], browser: [], treeShaking: false };
const workspace = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
);
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const shadcnCommand = latest ? npx : process.execPath;
const shadcnArgs = latest
  ? ["--yes", "shadcn@latest"]
  : [resolve("node_modules/shadcn/dist/index.js")];
const cliVersion = latest
  ? execFileSync(npx, [...shadcnArgs, "--version"], { encoding: "utf8" }).trim()
  : workspace.devDependencies.shadcn;
assert.match(
  cliVersion,
  /^\d+\.\d+\.\d+$/,
  "Installer must report a CLI version",
);
if (!latest) {
  assert.equal(
    JSON.parse(
      await readFile(join(root, "node_modules/shadcn/package.json"), "utf8"),
    ).version,
    cliVersion,
  );
}
evidence.installation = {
  mode: github ? "github" : "local checkout",
  cliVersion,
  channel: latest ? "latest" : "locked",
  revision,
  dirtySource,
  items: [],
};
evidence.consumerSnippets = [];

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (command, args, cwd = root, env = process.env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
let packedRegistry;
const consumer = await mkdtemp(join(tmpdir(), "audiobits-package-"));
try {
  await run(pnpm, ["exec", "publint", "packages/audiobits", "--strict"]);
  await run(pnpm, [
    "--filter",
    "audiobits",
    "pack",
    "--pack-destination",
    consumer,
  ]);
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
  const outputFiles = [
    "index.js",
    "index.d.ts",
    "schema.json",
    "capabilities.json",
  ];
  assert.deepEqual(
    emitted.toSorted(),
    outputFiles.toSorted(),
    "Unexpected build output",
  );
  const allowed = new Set([
    "package/package.json",
    "package/README.md",
    "package/LICENSE",
    "package/CHANGELOG.md",
    ...outputFiles.map((file) => `package/dist/${file}`),
  ]);
  assert.deepEqual(
    files.toSorted(),
    [...allowed].toSorted(),
    "Unexpected package files",
  );
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({
      name: "isolated-consumer",
      private: true,
      type: "module",
    }),
  );
  // npm in a system temporary directory cannot resolve workspace:* or root sources.
  await run(
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
    'import { createAudio, defineSound, validateRecipe } from "audiobits"; import { confirmation } from "./items/confirmation/src/sounds/recipes/confirmation/recipe.js"; import { impact } from "./items/impact/src/sounds/recipes/impact/recipe.js"; import { thruster } from "./items/thruster/src/sounds/recipes/thruster/recipe.js"; const audio = createAudio(); const recipe = defineSound(confirmation); audio.sound(recipe); const dynamic = () => { const voice = audio.sound(thruster).play({ seed: 42, parameters: { throttle: 0.2 } }); voice.set({ throttle: 1 }); const bus = audio.bus("effects"); bus.setGainDb(-6, 0.1); bus.setMuted(true); bus.setParent(audio.master); audio.sound(impact).play({ bus }); const analyser = audio.native.context.createAnalyser(); const detach = audio.native.connect(analyser); detach(); analyser.disconnect(); audio.stopAll({ tails: "cut" }); bus.dispose(); const seed: number = voice.seed; audio.sound(impact).play({ parameters: { intensity: 1 }, seed }); voice.stop(); }; void dynamic; console.log(validateRecipe(recipe)); void audio.dispose();\n',
  );
  // Versioned registry dependencies must resolve to this exact packed runtime,
  // including when the installer insists on reinstalling an existing version.
  // Serve only its npm metadata and archive on loopback; never substitute npm's
  // latest release for the candidate being verified.
  const packedManifest = JSON.parse(
    await readFile(
      join(consumer, "node_modules/audiobits/package.json"),
      "utf8",
    ),
  );
  const packedBytes = await readFile(archive);
  // The optional latest-CLI journey still obtains its tool from the configured
  // public registry. Only AudioBits resolution is confined to the candidate.
  const toolRegistry = latest
    ? execFileSync(npm, ["config", "get", "registry"], {
        encoding: "utf8",
      }).trim()
    : undefined;
  let packedRegistryUrl;
  packedRegistry = createServer((request, response) => {
    if (request.url === "/audiobits/-/runtime.tgz") {
      response.end(packedBytes);
    } else if (request.url === "/audiobits") {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          name: "audiobits",
          "dist-tags": { latest: packedManifest.version },
          versions: {
            [packedManifest.version]: {
              ...packedManifest,
              dist: {
                tarball: `${packedRegistryUrl}/audiobits/-/runtime.tgz`,
                integrity: `sha512-${createHash("sha512").update(packedBytes).digest("base64")}`,
              },
            },
          },
        }),
      );
    } else if (toolRegistry) {
      response
        .writeHead(307, { location: new URL(request.url, toolRegistry).href })
        .end();
    } else {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => {
    packedRegistry.once("error", reject);
    packedRegistry.listen(0, "127.0.0.1", resolve);
  });
  packedRegistryUrl = `http://127.0.0.1:${packedRegistry.address().port}`;
  const registry = JSON.parse(await readFile("registry.json", "utf8"));
  const registryOutput = join(consumer, "registry");
  if (!github) {
    // Use the CLI's own build format, with bytes from this checkout, never main.
    await run(shadcnCommand, [
      ...shadcnArgs,
      "build",
      "registry.json",
      "--output",
      registryOutput,
    ]);
  }
  console.log(
    `[Actual shadcn installation] CLI ${cliVersion} (${latest ? "latest" : "locked"}); ${github ? "GitHub" : "local checkout"}; commit ${revision}; dirty=${dirtySource}; items: ${registry.items.map((item) => item.name).join(", ")}`,
  );
  const catalogExamples = [];
  const manifestTypes = [];
  const consumerTypes = [];
  evidence.catalog = [];
  for (const item of registry.items) {
    // Each item has its own source tree. Sibling items cannot satisfy imports.
    const directory = join(consumer, "items", item.name);
    const types = [];
    for (const file of item.files) {
      const target = join(directory, file.target.replace(/^~\//, ""));
      await mkdir(resolve(target, ".."), { recursive: true });
      await copyFile(join(root, file.path), target);
      if (target.endsWith(".ts")) types.push(target);
    }
    const guide =
      item.meta.classification === "recipe"
        ? ""
        : await readFile(
            join(
              directory,
              item.files
                .find((file) => file.path.endsWith("/README.md"))
                .target.replace(/^~\//, ""),
            ),
            "utf8",
          );
    const matches = [...guide.matchAll(/```ts\n([\s\S]*?)```/g)].filter(
      (match) =>
        match[1].includes(
          `from "./sounds/${item.meta.classification === "recipe" ? "recipes" : "experiences"}/${item.name}/`,
        ),
    );
    if (item.meta.classification === "experience") {
      assert.equal(
        matches.length,
        1,
        `${item.name}: one working installed-path example`,
      );
    } else {
      assert.ok(
        item.name in sounds,
        `${item.name}: missing website presentation and usage setup`,
      );
    }
    const integration =
      item.meta.classification === "recipe"
        ? quickExample(item.name, parametersFor(sounds[item.name]), 42)
        : experienceExample(item.name, guide);
    const exampleSource = join(directory, "src/integration.ts");
    await writeFile(exampleSource, integration);
    types.push(exampleSource);
    catalogExamples.push({
      name: `catalog-${item.name}`,
      file: item.name,
      index: 0,
      code: integration,
      source: exampleSource,
      sustained: item.meta.requiredCapabilities.kinds.includes("sustained"),
    });
    manifestTypes.push(...types);
    // This consumer starts with only the packed runtime. No framework or
    // components.json is present, and sibling items cannot satisfy imports.
    const installedDirectory = join(consumer, "installed-items", item.name);
    await mkdir(installedDirectory, { recursive: true });
    await writeFile(
      join(installedDirectory, "package.json"),
      JSON.stringify({
        name: `consumer-${item.name}`,
        private: true,
        type: "module",
      }),
    );
    await run(
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
      installedDirectory,
    );
    const beforeInstall = await readFile(
      join(installedDirectory, "package.json"),
      "utf8",
    );
    const address = github
      ? `${new URL(registry.homepage).pathname.slice(1)}/${item.name}#${requestedRevision}`
      : join(registryOutput, `${item.name}.json`);
    await run(
      shadcnCommand,
      [...shadcnArgs, "add", address, "--yes", "--cwd", installedDirectory],
      installedDirectory,
      {
        ...process.env,
        npm_config_registry: packedRegistryUrl,
        npm_config_cache: join(consumer, "cache"),
        npm_config_ignore_scripts: "true",
      },
    );
    const expectedManifest = JSON.parse(beforeInstall);
    for (const dependency of item.dependencies) {
      if (dependency.startsWith("audiobits@"))
        expectedManifest.dependencies.audiobits = dependency.slice(
          "audiobits@".length,
        );
    }
    assert.deepEqual(
      JSON.parse(
        await readFile(join(installedDirectory, "package.json"), "utf8"),
      ),
      expectedManifest,
      `${item.name}: installer changed dependencies beyond registry requirements`,
    );
    for (const file of allowed) {
      const path = file.replace(/^package\//, "");
      assert.deepEqual(
        await readFile(
          join(installedDirectory, "node_modules/audiobits", path),
        ),
        await readFile(join(consumer, "node_modules/audiobits", path)),
        `${item.name}: installer substituted the packed runtime's ${path}`,
      );
    }
    assert.deepEqual(
      (await readdir(join(installedDirectory, "node_modules"))).sort(),
      [".package-lock.json", "audiobits"],
      `${item.name}: unexpected installed dependencies`,
    );
    assert.deepEqual(
      (await readdir(installedDirectory)).sort(),
      ["node_modules", "package-lock.json", "package.json", "src"].sort(),
      `${item.name}: unexpected framework/config files`,
    );
    const actualFiles = (
      await readdir(join(installedDirectory, "src"), {
        recursive: true,
        withFileTypes: true,
      })
    )
      .filter((file) => file.isFile())
      .map((file) =>
        relative(
          installedDirectory,
          join(file.parentPath, file.name),
        ).replaceAll("\\", "/"),
      );
    assert.ok(
      actualFiles.every((path) => !/LICENSE/i.test(path)),
      `${item.name}: redundant installed license file`,
    );
    assert.deepEqual(
      actualFiles.sort(),
      item.files.map((file) => file.target.replace(/^~\//, "")).sort(),
      `${item.name}: installed paths differ from manifest`,
    );
    for (const file of item.files) {
      assert.deepEqual(
        await readFile(
          join(installedDirectory, file.target.replace(/^~\//, "")),
        ),
        await readFile(join(root, file.path)),
        `${item.name}: installer changed bytes in ${file.target}`,
      );
    }
    evidence.installation.items.push({
      id: item.name,
      files: actualFiles.length,
      paths: "passed",
      bytes: "passed",
      dependencies: item.dependencies,
    });

    // Compile the same generators the website calls. Presentation can change
    // without extracting code from rendered markup or rewriting user imports.
    const snippets = [
      {
        source: "website usage",
        code: integration,
      },
    ];
    if (item.meta.classification === "recipe") {
      for (const control of [0, 0.5, 1]) {
        for (const seed of [0, 42, 0xffffffff]) {
          snippets.push({
            source: "quickExample",
            code: quickExample(
              item.name,
              parametersFor(sounds[item.name], control),
              seed,
            ),
          });
          snippets.push({
            source: "libraryExample",
            code: libraryExample(sounds[item.name], control, seed),
          });
        }
      }
    }
    if (item.meta.classification === "recipe") {
      const edited = JSON.parse(JSON.stringify(sounds[item.name]));
      edited.parameters = {
        ...edited.parameters,
        default: {
          min: 0,
          max: 1,
          default: 0.3,
          mode: edited.kind === "sustained" ? "live" : "play",
          ...(edited.kind === "sustained" ? { smoothing: 0.06 } : {}),
        },
      };
      snippets.push({
        source: "edited website usage",
        code: quickExample(item.name, parametersFor(edited), 7, edited),
      });
    }
    const installedTypes = item.files
      .filter((file) => file.path.endsWith(".ts"))
      .map((file) => join(installedDirectory, file.target.replace(/^~\//, "")));
    for (const [index, snippet] of snippets.entries()) {
      const source = join(
        installedDirectory,
        "src",
        index === 0 ? "integration.ts" : `snippet-${index}.ts`,
      );
      await writeFile(source, snippet.code);
      installedTypes.push(source);
    }
    consumerTypes.push(...installedTypes);
    evidence.consumerSnippets.push({
      id: item.name,
      count: snippets.length,
      sources: [...new Set(snippets.map((snippet) => snippet.source))],
      typecheck: "passed",
    });
    catalogExamples.at(-1).code = snippets[0].code;
    catalogExamples.at(-1).source = join(
      installedDirectory,
      "src/integration.ts",
    );
    const recipeFile = item.files.find(
      (file) =>
        file.path ===
        `catalog/${item.meta.classification === "recipe" ? "recipes" : "experiences"}/${item.name}/recipe.ts`,
    );
    const source = join(directory, recipeFile.target.replace(/^~\//, ""));
    await build({
      entry: [source],
      format: "esm",
      platform: "node",
      target: "es2022",
      outDir: join(directory, "validation"),
      dts: false,
      clean: true,
      external: ["audiobits"],
    });
    await run(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import assert from "node:assert/strict";
      import { validateRecipe } from "audiobits";
      import * as recipes from "./validation/recipe.mjs";
      for (const recipe of Object.values(recipes)) assert.equal(validateRecipe(recipe).ok, true);
    `,
      ],
      directory,
    );
    evidence.catalog.push({
      id: item.name,
      files: item.files.length,
      typecheck: "passed",
      validation: "passed",
      example: "typechecked",
    });
  }
  const documentation = [
    "catalog/README.md",
    ...registry.items.flatMap((item) =>
      item.files
        .filter((file) => file.path.endsWith(".md"))
        .map((file) => file.path),
    ),
    ...(await readdir("skills/audiobits", { recursive: true }).then((files) =>
      files
        .filter((file) => file.endsWith(".md"))
        .map((file) => `skills/audiobits/${file}`),
    )),
    ...(await readdir("apps/www/content/docs", { recursive: true }).then(
      (files) =>
        files
          .filter((file) => file.endsWith(".mdx"))
          .map((file) => `apps/www/content/docs/${file}`),
    )),
  ];
  evidence.documentation = [];
  for (const [documentIndex, file] of documentation.entries()) {
    const content = await readFile(file, "utf8");
    for (const [snippetIndex, match] of [
      ...content.matchAll(/```ts\n([\s\S]*?)```/g),
    ].entries()) {
      const code = match[1];
      const directory = join(
        consumer,
        "documentation",
        `${documentIndex}-${snippetIndex}`,
      );
      const source = join(directory, "src/integration.ts");
      await mkdir(join(directory, "src"), { recursive: true });
      const needed = new Set();
      for (const imported of ts.preProcessFile(code, true, true)
        .importedFiles) {
        if (!imported.fileName.startsWith(".")) continue;
        const specifier = imported.fileName.replace(/\.(?:ts|js)$/, "");
        const item = registry.items.find((item) =>
          item.files.some(
            (entry) =>
              `./${entry.target.slice("~/src/".length).replace(/\.ts$/, "")}` ===
              specifier,
          ),
        );
        assert.ok(
          item,
          `${file}: example imports noninstalled source ${imported.fileName}`,
        );
        needed.add(item);
      }
      for (const item of needed) {
        for (const entry of item.files) {
          const target = join(directory, entry.target.slice(2));
          await mkdir(resolve(target, ".."), { recursive: true });
          await copyFile(
            join(consumer, "installed-items", item.name, entry.target.slice(2)),
            target,
          );
          if (target.endsWith(".ts")) consumerTypes.push(target);
        }
      }
      await writeFile(source, code);
      consumerTypes.push(source);
      evidence.documentation.push({
        file,
        snippet: snippetIndex,
        items: [...needed].map((item) => item.name),
      });
      // Follow the official Skill for one-shot, sustained and coordinated sound.
      if (
        file.startsWith("skills/") &&
        needed.size === 1 &&
        /export async function play\(/.test(code)
      ) {
        const [item] = needed;
        if (["confirmation", "thruster", "lightsaber"].includes(item.name)) {
          catalogExamples.push({
            name: `skill-${item.name}`,
            file: item.name,
            guide: file,
            index: snippetIndex,
            code,
            source,
            sustained:
              item.meta.requiredCapabilities.kinds.includes("sustained"),
          });
        }
      }
    }
  }
  assert.deepEqual(
    catalogExamples
      .filter((example) => example.name.startsWith("skill-"))
      .map((example) => example.file)
      .sort(),
    ["confirmation", "lightsaber", "thruster"],
    "Three real Skill consumer paths are required",
  );
  // Each import still resolves from its own isolated item directory. Batching
  // shares TypeScript's standard-library work, with no aliases or source rewrites.
  for (const [name, sources] of [
    ["manifest", manifestTypes],
    ["consumer", consumerTypes],
  ]) {
    const config = join(consumer, `${name}.tsconfig.json`);
    await writeFile(
      config,
      JSON.stringify({
        compilerOptions: {
          noEmit: true,
          strict: true,
          noUncheckedSideEffectImports: true,
          module: "ESNext",
          moduleResolution: "Bundler",
          target: "ES2022",
          types: [],
        },
        files: sources.map((file) => relative(consumer, file)),
      }),
    );
    await run(
      process.execPath,
      [resolve("node_modules/typescript/bin/tsc"), "--project", config],
      consumer,
    );
  }
  console.log(
    `[Manifest/source validation] ${evidence.catalog.length} items: declared files, installed-path integration types and runtime recipe validation passed (manifest copies).`,
  );
  console.log(
    `[Actual shadcn installation] ${evidence.installation.items.length} items, ${evidence.installation.items.reduce((count, item) => count + item.files, 0)} files: paths, bytes and only audiobits dependency passed.`,
  );
  console.log(
    `[Documentation/Skill validation] ${evidence.documentation.length} unchanged examples compiled against packed audiobits and actual shadcn-installed source.`,
  );
  console.log(
    `[Exact consumer snippet validation] ${evidence.consumerSnippets.reduce((count, item) => count + item.count, 0)} unchanged snippets across ${evidence.consumerSnippets.length} items passed against shadcn-installed source and packed audiobits.`,
  );
  // Repository demonstrations are verified separately from installed source.
  await cp(join(root, "catalog"), join(consumer, "showcases/catalog"), {
    recursive: true,
  });
  const bladeDirectory = join(
    consumer,
    "showcases/catalog/experiences/lightsaber",
  );
  const thrusterDirectory = join(
    consumer,
    "showcases/catalog/experiences/reactive-thruster",
  );
  const energyDirectory = join(
    consumer,
    "showcases/catalog/experiences/energy-charge",
  );
  await writeFile(
    join(consumer, "authoring.types.ts"),
    (await readFile("packages/audiobits/tests/authoring.types.ts", "utf8"))
      .replace(
        /\.\.\/\.\.\/\.\.\/catalog\/recipes\/([^/]+)\/recipe/g,
        "./items/$1/src/sounds/recipes/$1/recipe.js",
      )
      .replaceAll("../src/index", "audiobits"),
  );
  await run(
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
  await run(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    assert.equal(typeof window, 'undefined');
    assert.equal(typeof AudioContext, 'undefined');
    const { createAudio, defineSound, validateRecipe } = await import('audiobits');
    const recipe = defineSound({ schemaVersion: 1, kind: 'one-shot', duration: 0.15,
      layers: [{ id: 'tone', source: { type: 'oscillator', waveform: 'sine', frequency: 660 },
        gainDb: -18, envelope: { attack: 0.004, decay: 0.08, sustain: 0.1, release: 0.04 } }] });
    const { default: schema } = await import('audiobits/schema.json', { with: { type: 'json' } });
    const { default: capabilities } = await import('audiobits/capabilities.json', { with: { type: 'json' } });
    assert.equal("curatedRecipes" in capabilities, false);
    assert.equal(capabilities.schemaVersion, schema.$defs.OneShotRecipe.properties.schemaVersion.const);
    assert.ok(validateRecipe(recipe).ok);
    const audio = createAudio();
    audio.sound(recipe);
    assert.equal(audio.state, 'idle');
    await audio.dispose();
    assert.equal(typeof createAudio, 'function');
    assert.equal(typeof defineSound, 'function');
    assert.equal(typeof validateRecipe, 'function');
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
  assert.deepEqual(Object.keys(manifest.exports).sort(), [
    ".",
    "./capabilities.json",
    "./schema.json",
  ]);
  if (
    manifest.private ||
    manifest.dependencies ||
    manifest.peerDependencies ||
    manifest.optionalDependencies
  )
    throw new Error(
      "Runtime must be publishable with zero runtime dependencies",
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
  assert.equal(capabilities.status, "stable");
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
  // Recreate the GitHub README's documented local source layout. It is not shipped.
  const copiedConfirmation = join(
    consumer,
    "sounds/recipes/confirmation/recipe.ts",
  );
  await mkdir(resolve(copiedConfirmation, ".."), { recursive: true });
  await copyFile(
    join(
      consumer,
      "items/confirmation/src/sounds/recipes/confirmation/recipe.ts",
    ),
    copiedConfirmation,
  );
  const examples = [];
  for (const [file, content] of [
    ["README.md", await readFile(join(installed, "README.md"), "utf8")],
    ["GitHub README.md", await readFile(join(root, "README.md"), "utf8")],
  ]) {
    const snippets = [...content.matchAll(/```ts\n([\s\S]*?)```/g)];
    assert.equal(
      snippets.length,
      1,
      `${file} must have one canonical quick start`,
    );
    for (const [index, match] of snippets.entries()) {
      const name = `example-${examples.length}`;
      await writeFile(join(consumer, `${name}.ts`), match[1]);
      examples.push({ name, file, index, code: match[1] });
      const packaged = file === "README.md";
      await run(
        process.execPath,
        [
          resolve("node_modules/typescript/bin/tsc"),
          "--noEmit",
          "--strict",
          "--module",
          packaged ? "NodeNext" : "ESNext",
          "--moduleResolution",
          packaged ? "NodeNext" : "Bundler",
          "--target",
          "ES2022",
          `${name}.ts`,
        ],
        consumer,
      );
    }
  }
  const delayCode = await readFile(
    join(root, "examples/vanilla/src/delay.ts"),
    "utf8",
  );
  await writeFile(join(consumer, "delay-example.ts"), delayCode);
  await run(
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
      "delay-example.ts",
    ],
    consumer,
  );
  examples.push({
    name: "delay-example",
    file: "Native delay consumer",
    index: 0,
    code: delayCode,
    // Feedback repeats keep this one-shot audible for about 1.85s.
    finishTimeout: 4000,
  });
  evidence.examples = examples.map(({ file, index }) => ({
    file,
    index,
    typecheck: "passed",
  }));
  examples.push(...catalogExamples);
  console.log(
    "[Browser/runtime verification] Chromium: README quick starts, all installed integrations, three Skill consumer paths and three repository demonstration hosts.",
  );
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
  for (const example of examples) {
    const browserSource =
      example.source?.replace(/\.ts$/, "-browser.ts") ??
      join(consumer, `${example.name}-browser.ts`);
    await writeFile(
      browserSource,
      `${example.code}
let context: AudioContext | undefined;
let analyser: AnalyserNode | undefined;
let detach: (() => void) | undefined;
let signal: Promise<{ peak: number; samples: number; startTime: number; endTime: number }> | undefined;
async function observeSignal() {
  // This runs synchronously on the running notification, before the example's
  // awaited start() schedules its voice. Sampling stays in the page, independent
  // of automation protocol round trips.
  probe.measure();
  const startTime = context!.currentTime;
  const deadline = performance.now() + 2000;
  let peak = 0;
  let samples = 0;
  do {
    peak = Math.max(peak, probe.measure());
    samples++;
    if (!Number.isFinite(peak) || peak > 0) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  } while (performance.now() < deadline);
  return { peak, samples, startTime, endTime: context!.currentTime };
}
const unsubscribe = audio.subscribe((state) => {
  if (state === "running" && !signal) signal = observeSignal();
});
const probe = {
  play,
  stop,
  ${example.sustained ? "update," : ""}
  ${["thruster", "energy-charge"].includes(example.file) ? "release," : ""}
  ${example.file === "lightsaber" ? "strike, retract," : ""}
  async dispose() { unsubscribe(); detach?.(); analyser?.disconnect(); await dispose(); },
  get signal() { return signal; },
  get contextTime() { return context?.currentTime; },
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
};
Object.assign(globalThis, { probe });`,
    );
    await build({
      entry: { [`${example.name}-browser`]: browserSource },
      format: "iife",
      globalName: "candidateExample",
      platform: "browser",
      target: "es2022",
      outDir: browserOutput,
      dts: false,
      clean: false,
    });
  }
  await build({
    entry: [join(thrusterDirectory, "host.ts")],
    format: "esm",
    platform: "browser",
    target: "es2022",
    outDir: browserOutput,
    dts: false,
    clean: false,
  });
  await build({
    entry: [join(energyDirectory, "host.ts")],
    format: "esm",
    platform: "browser",
    target: "es2022",
    outDir: join(browserOutput, "energy-charge"),
    dts: false,
    clean: false,
  });
  await build({
    entry: [join(bladeDirectory, "host.ts"), join(bladeDirectory, "stage.ts")],
    format: "esm",
    platform: "browser",
    target: "es2022",
    outDir: join(browserOutput, "lightsaber"),
    dts: false,
    clean: false,
  });
  const bladeHtml = (await readFile(join(bladeDirectory, "index.html"), "utf8"))
    .replace('"./host.ts"', '"./lightsaber/host.js"')
    .replace('"./stage.ts"', '"./lightsaber/stage.js"');
  const energyHtml = (
    await readFile(join(energyDirectory, "index.html"), "utf8")
  ).replace('"./host.ts"', '"./energy-charge/host.js"');
  const thrusterHtml = (
    await readFile(join(thrusterDirectory, "index.html"), "utf8")
  ).replace('"./host.ts"', '"./host.js"');
  const server = createServer(async (request, response) => {
    if (request.url === "/blade") {
      response.setHeader("Content-Type", "text/html");
      response.end(bladeHtml);
      return;
    }
    if (
      request.url?.startsWith("/lightsaber/") &&
      /^\/lightsaber\/[A-Za-z0-9_.-]+\.js$/.test(request.url)
    ) {
      response.setHeader("Content-Type", "text/javascript");
      response.end(await readFile(join(browserOutput, request.url.slice(1))));
      return;
    }
    if (request.url === "/energy") {
      response.setHeader("Content-Type", "text/html");
      response.end(energyHtml);
      return;
    }
    if (request.url === "/energy-charge/host.js") {
      response.setHeader("Content-Type", "text/javascript");
      response.end(
        await readFile(join(browserOutput, "energy-charge/host.js")),
      );
      return;
    }
    if (request.url === "/thruster") {
      response.setHeader("Content-Type", "text/html");
      response.end(thrusterHtml);
      return;
    }
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
    {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (cause) => errors.push(cause.message));
      await page.addInitScript(() => {
        const Native = globalThis.AudioContext;
        globalThis.bladeContexts = [];
        globalThis.AudioContext = class extends Native {
          constructor() {
            super();
            globalThis.bladeContexts.push(this);
          }
        };
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/blade`);
      assert.equal(
        await page.evaluate(() => globalThis.bladeContexts.length),
        0,
      );
      await page.getByRole("button", { name: "Ignite", exact: true }).click();
      await page.waitForFunction(
        () =>
          globalThis.document.querySelector("#stage").dataset.state ===
          "running",
      );
      await page.waitForFunction(
        () =>
          Number(globalThis.document.querySelector("#stage").dataset.peak) > 0,
      );
      await page
        .getByRole("button", { name: "Strike target", exact: true })
        .click();
      await expect(page.locator("#stage")).toHaveAttribute("data-hits", "1");
      await page.getByRole("button", { name: "Retract", exact: true }).click();
      await page.waitForFunction(
        () =>
          globalThis.document.querySelector("#stage").dataset.extension ===
          "0.000",
      );
      await page.getByRole("button", { name: "Ignite", exact: true }).click();
      await page.waitForFunction(
        () =>
          globalThis.document.querySelector("#stage").dataset.state ===
          "running",
      );
      await page.getByRole("button", { name: "Stop all", exact: true }).click();
      await page.evaluate(() =>
        globalThis.dispatchEvent(new globalThis.Event("pagehide")),
      );
      await page.waitForFunction(() =>
        globalThis.bladeContexts.every((context) => context.state === "closed"),
      );
      assert.deepEqual(errors, []);
      evidence.browser.push({
        file: "catalog/experiences/lightsaber/index.html",
        independentHost: true,
        closed: true,
      });
      await page.close();
    }
    {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => {
        globalThis.thrusterContexts = [];
        const Native = globalThis.AudioContext;
        globalThis.AudioContext = class extends Native {
          constructor() {
            super();
            globalThis.thrusterContexts.push(this);
          }
        };
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/thruster`);
      await page
        .getByRole("button", { name: "Start thruster", exact: true })
        .click();
      await expect(page.locator("#status")).toHaveText("running");
      await page.getByRole("slider", { name: "Throttle" }).fill("0.8");
      await expect(page.locator("#pad")).toHaveText("Thrust 80%");
      await page.getByRole("button", { name: "Play impact" }).click();
      await page.getByRole("button", { name: "Stop all" }).click();
      await expect(page.locator("#status")).toHaveText("stopped");
      await page.evaluate(() =>
        globalThis.window.dispatchEvent(new globalThis.Event("pagehide")),
      );
      await expect
        .poll(() =>
          page.evaluate(() =>
            globalThis.thrusterContexts.map((context) => context.state),
          ),
        )
        .toEqual(["closed"]);
      assert.deepEqual(errors, []);
      evidence.browser.push({
        file: "catalog/experiences/reactive-thruster/index.html",
        independentHost: true,
        closed: true,
      });
      await page.close();
    }
    {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => {
        globalThis.energyContexts = [];
        const Native = globalThis.AudioContext;
        globalThis.AudioContext = class extends Native {
          constructor() {
            super();
            globalThis.energyContexts.push(this);
          }
        };
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/energy`);
      assert.deepEqual(
        await page.evaluate(() => globalThis.energyContexts.length),
        0,
      );
      await page
        .getByRole("button", { name: "Start charge", exact: true })
        .click();
      await expect(page.locator("#status")).toHaveText("running");
      for (const value of ["1", "0.3", "0.3", "0.8"]) {
        await page
          .getByRole("slider", { name: "Charge", exact: true })
          .fill(value);
        await expect(page.locator("#status")).toHaveText("running");
      }
      await page.getByRole("button", { name: "Release charge" }).click();
      await expect(page.locator("#status")).toHaveText("stopped");
      await page
        .getByRole("button", { name: "Start charge", exact: true })
        .click();
      await expect(page.locator("#status")).toHaveText("running");
      await page.getByRole("button", { name: "Stop all" }).click();
      await expect(page.locator("#status")).toHaveText("stopped");
      await page.evaluate(() =>
        globalThis.window.dispatchEvent(new globalThis.Event("pagehide")),
      );
      await expect
        .poll(() =>
          page.evaluate(() => globalThis.energyContexts.map((c) => c.state)),
        )
        .toEqual(["closed"]);
      assert.deepEqual(errors, []);
      evidence.browser.push({
        file: "catalog/experiences/energy-charge/index.html",
        independentHost: true,
        closed: true,
      });
      await page.close();
    }
    for (const example of examples) {
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
      if (!example.sustained) {
        // Retrieve after finite voices finish: later automation reads must still
        // see the captured playback signal, rather than just current silence.
        await expect
          .poll(() => page.evaluate(() => globalThis.probe.counts), {
            timeout: example.finishTimeout ?? 2000,
            message: `Finite host did not finish: ${example.name}`,
          })
          .toEqual({ active: 0, retiring: 0 })
          .catch(async (error) => {
            console.error("Finite host diagnostics", {
              example: example.name,
              ...(await page.evaluate(async () => ({
                signal: await globalThis.probe.signal,
                state: globalThis.probe.state,
                contextState: globalThis.probe.contextState,
                contextTime: globalThis.probe.contextTime,
                counts: globalThis.probe.counts,
              }))),
              errors,
            });
            throw error;
          });
      }
      const signal = await page.evaluate(() => globalThis.probe.signal);
      const diagnostics = await page.evaluate(() => ({
        state: globalThis.probe.state,
        contextState: globalThis.probe.contextState,
        contextTime: globalThis.probe.contextTime,
        counts: globalThis.probe.counts,
      }));
      const diagnostic = JSON.stringify({
        example: example.name,
        file: example.file,
        index: example.index,
        signal,
        ...diagnostics,
      });
      assert.ok(
        signal && Number.isFinite(signal.peak) && signal.peak > 0,
        `Native signal must be nonzero and finite: ${diagnostic}`,
      );
      const peak = signal.peak;
      if (example.sustained) {
        assert.ok(
          (await page.evaluate(() => globalThis.probe.counts)).active > 0,
        );
        await page.evaluate(() => globalThis.probe.update(0.8));
        await page.evaluate(() => globalThis.probe.update(0.3));
        if (example.file === "lightsaber") {
          assert.equal(
            await page.evaluate(() => globalThis.probe.strike()),
            true,
          );
          await page.evaluate(() => globalThis.probe.retract());
        }
      }
      if (["thruster", "energy-charge"].includes(example.file)) {
        await page.evaluate(() => globalThis.probe.release());
        const releasing = await page.evaluate(() => globalThis.probe.counts);
        // Natural release stays counted as an owned stopping voice; retiring
        // is reserved for voice stealing, rather than ordinary release.
        assert.deepEqual(
          releasing,
          { active: 1, retiring: 0 },
          `${example.name}: release must preserve the owned tail`,
        );
        await expect
          .poll(() => page.evaluate(() => globalThis.probe.counts), {
            timeout: 2000,
          })
          .toEqual({ active: 0, retiring: 0 });
      }
      await page.click("#stop");
      await expect
        .poll(
          () =>
            page.evaluate(() => ({
              peak: globalThis.probe.measure(),
              counts: globalThis.probe.counts,
            })),
          {
            timeout: 2000,
            message: `Stop must clear signal/tails: ${diagnostic}`,
          },
        )
        .toEqual({ peak: 0, counts: { active: 0, retiring: 0 } });
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
      const catalogItem = evidence.catalog.find(
        (item) => item.id === example.file,
      );
      if (catalogItem)
        catalogItem.example = "Chromium playback, update/stop, disposal passed";
      evidence.browser.push({
        file: example.file,
        guide: example.guide,
        index: example.index,
        peak,
        observation: signal,
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
  if (packedRegistry?.listening)
    await new Promise((resolve) => packedRegistry.close(resolve));
  await rm(consumer, { recursive: true, force: true });
}
