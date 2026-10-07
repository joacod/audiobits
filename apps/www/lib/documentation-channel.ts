export function documentationChannel(
  manifest: { name: string; version: string; private: boolean },
  input: { channel?: string; releasedVersion?: string; source?: string } = {},
) {
  if (input.channel && !["development", "stable"].includes(input.channel))
    throw new Error("Unknown documentation channel");
  if (input.channel === "stable") {
    if (
      manifest.private ||
      !/^\d+\.\d+\.\d+$/.test(manifest.version) ||
      manifest.version === "0.0.0" ||
      input.releasedVersion !== manifest.version ||
      !/^[a-f0-9]{40}$/.test(input.source ?? "")
    )
      throw new Error(
        "Stable docs require an activated release, matching released version and reviewed source commit",
      );
    return {
      version: manifest.version,
      channel: "Stable",
      source: `Released package · ${input.source}`,
    };
  }
  return {
    version: manifest.version,
    channel: manifest.private ? "Unreleased" : "Development",
    source: "Local workspace package",
  };
}
