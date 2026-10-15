import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Internal reference page: kept out of search results
export const metadata: Metadata = {
  title: "Design system · Nadi-Gati",
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  // A developer tool, not part of the public site: it shows sample alerts and readings that
  // could be mistaken for real ones, so it only exists in development
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return children;
}
