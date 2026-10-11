import type { CatalogEntry } from "../lib/catalog";

export function openCatalogLabel(entry: CatalogEntry) {
  const name = entry.title.toLowerCase();
  return entry.category === "experience"
    ? `Open ${name}`
    : `Open ${name} workbench`;
}
