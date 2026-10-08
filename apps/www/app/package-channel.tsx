import { siteBuild } from "../lib/site-build";

export function PackageChannel() {
  return <p>AudioBits API · {siteBuild.version} · Available on npm.</p>;
}
