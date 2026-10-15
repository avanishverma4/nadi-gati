"use client";

/**
 * "Skip to main content" link. Following the #main-content anchor scrolls, but a <main> isn't
 * focusable, so keyboard focus would stay at the top of the page. Move focus there too.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      onClick={() => {
        const main = document.getElementById("main-content");
        if (!main) return;
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:inline-flex focus:items-center focus:h-11 focus:px-5 focus:rounded-full focus:bg-primary focus:text-on-primary focus:font-sans focus:font-semibold focus:text-sm focus:shadow-elevation-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
