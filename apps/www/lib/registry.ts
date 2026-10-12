import registry from "../../../registry.json" with { type: "json" };

export function registryItem(id: string) {
  const item = registry.items.find((item) => item.name === id);
  if (!item) throw new Error(`Unknown catalog item: ${id}`);
  return item;
}

export function registryInstallCommand(id: string) {
  const item = registryItem(id);
  const repository = new URL(registry.homepage).pathname.slice(1);
  return `npx shadcn@latest add ${repository}/${item.name}`;
}

export function experienceSourceFiles(id: string) {
  const item = registryItem(id);
  const base = `~/src/sounds/experiences/${id}/`;
  return item.files
    .filter((file) => /\.(ts|html)$/.test(file.path))
    .map((file) => ({
      path: file.path,
      name: file.target.startsWith(base)
        ? file.target.slice(base.length)
        : `../../${file.target.slice("~/src/sounds/".length)}`,
    }));
}
