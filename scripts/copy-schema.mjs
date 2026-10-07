import { copyFile } from "node:fs/promises";
for (const name of ["schema", "capabilities"])
  await copyFile(
    new URL(`../packages/audiobits/src/recipe/${name}.json`, import.meta.url),
    new URL(`../packages/audiobits/dist/${name}.json`, import.meta.url),
  );
