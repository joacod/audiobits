import Link from "next/link";
import { BrandMark } from "./brand-mark";

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
          <Link href="/" aria-current={current === "home" ? "page" : undefined}>
            Home
          </Link>
          <Link
            href="/catalog"
            aria-current={current === "catalog" ? "page" : undefined}
          >
            Catalog
          </Link>
          <Link href="/docs">Docs</Link>
          <a href={github}>GitHub</a>
        </div>
      </nav>
    </header>
  );
}
