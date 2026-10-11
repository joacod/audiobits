"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { catalogEntries, catalogGroups } from "../lib/catalog";

const query = "(max-width: 760px)";

function currentCatalogSlug() {
  const list = catalogEntries
    .map((entry) => document.getElementById(entry.slug))
    .filter((node): node is HTMLElement => node !== null);
  const fallback = catalogEntries[0]?.slug ?? "";
  if (list.length === 0) return fallback;
  const atEnd =
    window.scrollY + window.innerHeight >=
    document.documentElement.scrollHeight - 16;
  if (atEnd) {
    const visible = list.filter((node) => {
      const box = node.getBoundingClientRect();
      return box.bottom > 0 && box.top < window.innerHeight;
    });
    return (
      (visible[visible.length - 1] ?? list[list.length - 1])?.id ?? fallback
    );
  }
  const marker = 72;
  let next = list[0]?.id ?? fallback;
  let nextTop = Number.NEGATIVE_INFINITY;
  for (const node of list) {
    const top = node.getBoundingClientRect().top;
    if (top > marker) break;
    if (top > nextTop + 12) {
      next = node.id;
      nextTop = top;
    }
  }
  return next;
}

const subscribeNarrow = (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

export function CatalogLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const detail = pathname !== "/catalog";
  const routed = catalogEntries.find((entry) => entry.href === pathname)?.slug;
  const menuId = useId();
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(query).matches,
    () => false,
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(catalogEntries[0]?.slug ?? "");
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  if (!narrow && open) setOpen(false);
  const dialog = narrow && open;

  useEffect(() => {
    if (routed) return;
    const sync = () => {
      const next = currentCatalogSlug();
      if (next) setActive((current) => (current === next ? current : next));
    };
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [routed]);

  useEffect(() => {
    if (!dialog) return;
    const root = panel.current;
    const button = trigger.current;
    const items = () =>
      [
        ...(root?.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ) ?? []),
      ].filter((element) => element.getClientRects().length > 0);
    root?.querySelector<HTMLElement>("a[href]")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        button?.focus();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const focusable = items();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const focused = document.activeElement;
      if (event.shiftKey && (focused === first || !root.contains(focused))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog]);

  function closeMenu() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div
      className={detail ? "catalog-layout catalog-detail" : "catalog-layout"}
    >
      <div className="catalog-toolbar">
        {detail ? null : <h1>Catalog</h1>}
        <button
          ref={trigger}
          type="button"
          className="catalog-menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-haspopup="dialog"
          onClick={() => setOpen((value) => !value)}
        >
          Catalog menu
        </button>
        {dialog && (
          <button
            type="button"
            className="catalog-backdrop"
            aria-label="Close catalog menu"
            onClick={closeMenu}
          />
        )}
        <div
          ref={panel}
          id={menuId}
          className="catalog-nav-panel"
          data-open={open ? "true" : undefined}
          role={dialog ? "dialog" : undefined}
          aria-modal={dialog ? true : undefined}
          aria-label={dialog ? "Catalog menu" : undefined}
          inert={narrow && !open ? true : undefined}
        >
          <button type="button" className="catalog-close" onClick={closeMenu}>
            Close
          </button>
          <nav aria-label="Catalog">
            {catalogGroups.map((group) => (
              <div key={group.id}>
                <h2 id={`catalog-group-${group.id}`}>{group.title}</h2>
                <ul aria-labelledby={`catalog-group-${group.id}`}>
                  {catalogEntries
                    .filter((entry) => entry.category === group.category)
                    .map((entry) => (
                      <li key={entry.slug}>
                        <Link
                          href={entry.href}
                          aria-current={
                            routed
                              ? routed === entry.slug
                                ? "page"
                                : undefined
                              : active === entry.slug
                                ? "location"
                                : undefined
                          }
                          onClick={() => setOpen(false)}
                        >
                          {entry.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
      <div className="catalog-main">{children}</div>
    </div>
  );
}
