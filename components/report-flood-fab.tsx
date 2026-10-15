"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle } from "lucide-react";

/** Floating "Report a flood" button for pages that don't already show one */
export function ReportFloodFab() {
  const pathname = usePathname();

  // Hide the floating button on the report page itself and wherever the navbar or the page
  // header already carries a "Report flood" button
  const hasHeaderReportButton =
    pathname === "/" ||
    pathname === "/districts" ||
    pathname === "/ghats" ||
    pathname.startsWith("/about") ||
    /^\/district\/[^/]+(\/river\/[^/]+)?$/.test(pathname);

  if (pathname === "/report" || hasHeaderReportButton) {
    return null;
  }

  return (
    <div
      id="persistent-report-fab-container"
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 print:hidden pointer-events-none"
    >
      <Link
        href="/report"
        id="persistent-report-flood-button"
        className="pointer-events-auto group inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-error text-on-error shadow-elevation-3 hover:brightness-110 active:brightness-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 min-h-[48px] border border-white/20"
        aria-label="Report a flood incident (no login required)"
      >
        <div className="relative flex items-center justify-center">
          {/* One short attention cue when the button appears, not an endless pulse */}
          <AlertCircle className="w-5 h-5 text-on-error" aria-hidden="true" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping-few absolute inline-flex h-full w-full rounded-full bg-on-error opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-on-error"></span>
          </span>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-sans font-bold text-xs sm:text-sm tracking-tight leading-none text-on-error">
            Report a flood
          </span>
          <span className="font-sans text-xs text-on-error/90 leading-tight">
            No login required
          </span>
        </div>
      </Link>
    </div>
  );
}
