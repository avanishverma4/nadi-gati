"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Waves,
  Menu,
  X,
  AlertCircle,
  Home,
  MapPin,
  Map as MapIcon,
  Info,
  ChevronRight,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Pathname prefixes that mark this item as the current section */
  match: string[];
  /** Only listed in the mobile menu (the logo already links home on desktop) */
  mobileOnly?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { id: "home", href: "/", label: "Home", icon: Home, match: [], mobileOnly: true },
  {
    id: "districts",
    href: "/districts",
    label: "Districts",
    icon: MapPin,
    match: ["/districts", "/district/"],
  },
  { id: "ghats", href: "/ghats", label: "River levels", icon: Waves, match: ["/ghats"] },
  { id: "map", href: "/#map-section", label: "Flood map", icon: MapIcon, match: [] },
  { id: "about", href: "/about", label: "About", icon: Info, match: ["/about"] },
];

const ABOUT_SUBNAV: Array<{ id: string; href: string; label: string }> = [
  { id: "overview", href: "/about", label: "Overview" },
  { id: "sources", href: "/about/sources", label: "Data sources" },
  { id: "verification", href: "/about/verification", label: "Verification" },
  { id: "legal", href: "/about/legal", label: "Legal" },
  { id: "privacy", href: "/about/privacy", label: "Privacy" },
  { id: "terms", href: "/about/terms", label: "Terms" },
  { id: "contact", href: "/about/contact", label: "Contact" },
];

/**
 * Site-wide navbar: brand, primary destinations, theme toggle and one "Report a flood" action.
 * Below the md breakpoint the links move into a full-height menu. About pages get a slim section row.
 */
export function SiteHeader({ id = "site-header" }: { id?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const headerRef = useRef<HTMLElement | null>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement | null>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // While the mobile menu is open, keyboard focus stays in the header (bar + menu) instead of
  // wandering into the page hidden behind it. Escape closes the menu, the page behind doesn't
  // scroll, and focus returns to the menu button.
  useFocusTrap(menuOpen, headerRef, { onEscape: closeMenu, initialFocusRef: firstMenuLinkRef });

  const isActive = (item: NavItem) =>
    item.href === "/" ? pathname === "/" : item.match.some((prefix) => pathname.startsWith(prefix));
  const showAboutSubnav = pathname.startsWith("/about") && !menuOpen;

  return (
    <header
      ref={headerRef}
      id={id}
      className={`sticky top-0 z-40 border-b border-outline-variant/50 ${
        menuOpen ? "bg-surface" : "bg-surface/80 backdrop-blur-xl"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3 sm:gap-6">
        {/* Brand */}
        <Link
          href="/"
          id={`${id}-brand-link`}
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg pr-1 flex-shrink-0"
          aria-label="Nadi-Gati home"
        >
          <span className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center transition-transform group-hover:scale-105">
            <Waves className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="font-sans font-bold text-lg tracking-tight text-on-surface whitespace-nowrap">
            Nadi-Gati
          </span>
        </Link>

        {/* Primary links - Desktop */}
        <nav
          id={`${id}-desktop-nav`}
          className="hidden md:flex items-center gap-1 text-sm font-sans font-medium"
          aria-label="Main"
        >
          {PRIMARY_NAV.filter((item) => !item.mobileOnly).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              id={`nav-link-${item.id}`}
              aria-current={isActive(item) ? "page" : undefined}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap text-on-surface-variant hover:text-on-surface hover:bg-surface-container aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <item.icon className="hidden lg:block w-4 h-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="hidden md:block">
            <ThemeToggle id={`${id}-theme-toggle`} iconOnly />
          </div>
          <Link
            href="/report"
            id={`${id}-report-btn`}
            onClick={() => setMenuOpen(false)}
            className="inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] rounded-full bg-error text-on-error font-sans font-semibold text-sm whitespace-nowrap hover:brightness-110 active:brightness-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="Report a flood"
          >
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <span className="lg:hidden">Report</span>
            <span className="hidden lg:inline">Report a flood</span>
          </Link>
          <button
            type="button"
            id={`${id}-menu-toggle`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls={`${id}-mobile-nav`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border border-outline-variant/70 text-on-surface hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {menuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Menu - Mobile. Positioned from the header so it covers the page below the bar. */}
      {menuOpen && (
        <div
          id={`${id}-mobile-nav`}
          className="md:hidden absolute inset-x-0 top-full h-[calc(100dvh-4rem)] bg-surface overflow-y-auto border-t border-outline-variant/50 animate-in fade-in duration-200"
        >
          <nav aria-label="Main" className="px-4 pt-3 pb-2 flex flex-col gap-1">
            {PRIMARY_NAV.map((item, index) => (
              <Link
                key={item.id}
                ref={index === 0 ? firstMenuLinkRef : undefined}
                href={item.href}
                id={`mobile-nav-link-${item.id}`}
                aria-current={isActive(item) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className="group flex items-center gap-3 min-h-[56px] px-3 rounded-2xl font-sans font-medium text-base text-on-surface hover:bg-surface-container aria-[current=page]:bg-primary-container aria-[current=page]:text-on-primary-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="w-10 h-10 rounded-xl bg-surface-container group-aria-[current=page]:bg-surface/40 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                </span>
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-on-surface-variant" aria-hidden="true" />
              </Link>
            ))}
          </nav>

          <div className="mx-4 mt-2 pt-4 pb-6 border-t border-outline-variant/50 flex flex-col gap-3">
            <div className="flex items-center justify-between px-3">
              <span className="font-sans text-sm text-on-surface-variant">Appearance</span>
              <ThemeToggle id={`${id}-mobile-theme-toggle`} size="sm" showLabel />
            </div>
            <a
              href="tel:112"
              id={`${id}-mobile-emergency-link`}
              className="flex items-center gap-3 min-h-[56px] px-3 rounded-2xl border border-error/40 text-on-surface hover:bg-error/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
            >
              <span className="w-10 h-10 rounded-xl bg-error/15 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-error" aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-sans font-semibold text-sm">Emergency? Call 112</span>
                <span className="font-sans text-xs text-on-surface-variant">
                  National emergency helpline
                </span>
              </span>
            </a>
          </div>
        </div>
      )}

      {/* About section row */}
      {showAboutSubnav && (
        <nav
          id={`${id}-about-subnav`}
          className="border-t border-outline-variant/40"
          aria-label="About"
        >
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 flex items-center gap-1 overflow-x-auto text-sm font-sans whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ABOUT_SUBNAV.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                id={`about-subnav-${item.id}`}
                aria-current={pathname === item.href ? "page" : undefined}
                className="px-3 py-3 border-b-2 border-transparent text-on-surface-variant hover:text-on-surface aria-[current=page]:border-primary aria-[current=page]:text-on-surface aria-[current=page]:font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
