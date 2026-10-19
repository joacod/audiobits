"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ExperienceLink } from "./experience-link";
import { usePathname } from "next/navigation";
import { catalogEntries, catalogGroups } from "../lib/catalog";

const query = "(max-width: 760px)";

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
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  if (!narrow && open) setOpen(false);
  const dialog = narrow && open;

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

  if (!detail) {
    return (
      <div className="catalog-index">
        <h1>Catalog</h1>
        {children}
      </div>
    );
  }

  return (
    <div className="catalog-layout catalog-detail">
      <div className="catalog-toolbar">
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
                        <ExperienceLink
                          href={entry.href}
                          aria-current={
                            routed === entry.slug ? "page" : undefined
                          }
                          onClick={() => setOpen(false)}
                        >
                          {entry.title}
                        </ExperienceLink>
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
