import Link from "next/link";
import { BrandMark } from "../icons/brand-mark";
import { GithubIcon } from "../icons/github-icon";
import { NpmIcon } from "../icons/npm-icon";

const github = "https://github.com/joacod/audiobits";

export function SiteHeader({ current }: { current?: "home" | "catalog" }) {
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/" className="wordmark">
          <BrandMark size={28} />
          AudioBits
        </Link>
        <div className="site-nav-links">
          <Link
            href="/catalog"
            aria-current={current === "catalog" ? "page" : undefined}
          >
            Catalog
          </Link>
          <Link href="/docs">Docs</Link>
          <a
            href={github}
            className="site-brand-link"
            aria-label="GitHub"
            title="AudioBits on GitHub"
          >
            <GithubIcon />
          </a>
          <a
            href="https://www.npmjs.com/package/audiobits"
            className="site-brand-link"
            aria-label="npm"
            title="AudioBits on npm"
          >
            <NpmIcon />
          </a>
        </div>
      </nav>
    </header>
  );
}
