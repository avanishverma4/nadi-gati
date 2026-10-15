import Link from "next/link";
import { ArrowRight, Waves } from "lucide-react";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex-1 min-h-[70vh] bg-surface text-on-surface flex items-center justify-center px-4 py-16"
    >
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-primary-container mx-auto flex items-center justify-center shadow-xs">
          <Waves className="w-6 h-6 text-primary" />
        </div>
        <p className="text-xs font-sans font-bold uppercase tracking-wider text-primary">
          Error 404
        </p>
        <h1 className="font-sans font-bold text-2xl sm:text-3xl tracking-tight">
          We couldn&apos;t find that page
        </h1>
        <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
          The district, river gauge, or page you were looking for doesn&apos;t exist or has moved.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/districts"
            id="not-found-districts-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm shadow-elevation-1 hover:brightness-110 transition-all min-h-[48px]"
          >
            <span>Browse districts</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            id="not-found-home-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full border border-outline-variant bg-surface-container text-on-surface font-sans font-semibold text-sm hover:bg-surface-container-high transition-all min-h-[48px]"
          >
            Back to home
          </Link>
        </div>
        <p className="pt-4 text-xs font-sans text-on-surface-variant">
          Life-threatening emergency? Call 112 / 1078
        </p>
      </div>
    </main>
  );
}
