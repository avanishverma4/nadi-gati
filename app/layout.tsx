import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import { SkipLink } from "@/components/skip-link";
import { ThemeProvider } from "@/components/theme-provider";
import { ReportFloodFab } from "@/components/report-flood-fab";
import { GlobalFooter } from "@/components/global-footer";
import { OfflineStatusProvider } from "@/components/offline-status-banner";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";

// Hindi text (taglines, river and basin names) needs a Devanagari face; the brand font has none,
// so without this it falls back to whatever the phone happens to have. Self-hosted by next/font.
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-devanagari",
});

// Google Sans is served by Google Fonts but isn't in next/font's list yet, so it is linked here.
// Don't move it into globals.css as an @import: after the Tailwind rules, browsers ignore it.
const BRAND_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Google+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Roboto+Mono:wght@400;500;600;700&display=swap";

export const viewport: Viewport = {
  // Match the page background (--surface) so the mobile browser bar blends with the header
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#111315" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Nadi-Gati | River levels and flood reports",
  description:
    "River levels and community flood reports for districts in Bihar and Assam. A free, open-source pilot; not an official warning service.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nadi-Gati",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Nadi-Gati | River levels and flood reports",
    description:
      "River levels and community flood reports for districts in Bihar and Assam. A free, open-source pilot; not an official warning service.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nadi-Gati | River levels and flood reports",
    description:
      "River levels and community flood reports for districts in Bihar and Assam. A free, open-source pilot; not an official warning service.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The Devanagari font variable must be on <html>: --font-sans is defined on :root and refers
    // to it, and a variable missing at :root makes the whole font stack invalid
    <html lang="en" data-theme="dark" className={devanagari.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nadi_gati_theme');if(!t&&window.matchMedia('(prefers-color-scheme: light)').matches){t='light';}if(!t){t='dark';}document.documentElement.setAttribute('data-theme',t);if(t==='dark'){document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');}else{document.documentElement.classList.add('light');document.documentElement.classList.remove('dark');}document.documentElement.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={BRAND_FONTS_URL} />
        {/* Entrance animations start content at opacity 0 and rely on JavaScript to reveal it.
            Without JavaScript, show everything as it is. */}
        <noscript>
          <style>{`[style*="opacity:0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body
        className={`font-sans antialiased min-h-screen flex flex-col bg-surface text-on-surface`}
        suppressHydrationWarning
      >
        {/* First thing a keyboard user reaches: jumps past the header to the page content */}
        <SkipLink />
        <ThemeProvider>
          <OfflineStatusProvider>
            <PwaRegister />
            <div className="flex-1 flex flex-col">{children}</div>
            <GlobalFooter />
            <ReportFloodFab />
            <PwaInstallPrompt />
          </OfflineStatusProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
