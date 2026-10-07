import { siteBuild } from "../lib/site-build";

export function PackageChannel() {
  return (
    <p>
      {siteBuild.channel === "Unreleased" ? "AudioBits is unreleased. " : ""}
      {siteBuild.channel} API · {siteBuild.version} · {siteBuild.source}.
    </p>
  );
}
