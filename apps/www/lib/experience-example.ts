export function experienceExample(slug: string, guide: string) {
  const code = [...guide.matchAll(/```ts\n([\s\S]*?)```/g)].find((match) =>
    match[1].includes(`./sounds/experiences/${slug}/`),
  )?.[1];
  if (!code) throw new Error(`Missing integration example for ${slug}`);
  return slug === "energy-charge"
    ? code.replace(
        "export function stop()",
        `// Release with the recipe's natural tail.
export function release() {
  request++;
  charge.release();
}

export function stop()`,
      )
    : code;
}
