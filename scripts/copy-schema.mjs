import { copyFile } from "node:fs/promises";
await copyFile(
  new URL("../packages/audiobits/src/recipe/schema.json", import.meta.url),
  new URL("../packages/audiobits/dist/schema.json", import.meta.url),
);
