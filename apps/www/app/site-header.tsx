import Link from "next/link";

const github = "https://github.com/joacod/audiobits";

export function SiteHeader({ current }: { current?: "home" | "catalog" }) {
  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="Main navigation">
        <Link href="/" className="wordmark">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="mark-core" cx="12" cy="12" r="3.1" />
            <circle
              cx="12"
              cy="12"
              r="7.25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle
              cx="12"
              cy="12"
              r="11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
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
