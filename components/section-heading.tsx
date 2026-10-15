import React from "react";

// Eyebrow label, title and intro used at the top of each marketing-page section
export function SectionHeading({
  id,
  icon: Icon,
  eyebrow,
  title,
  body,
  centered = false,
}: {
  id: string;
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  body?: string;
  centered?: boolean;
}) {
  return (
    <div className={`max-w-2xl space-y-4 ${centered ? "mx-auto text-center" : ""}`}>
      <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold tracking-wider text-primary uppercase">
        <Icon className="w-4 h-4" aria-hidden="true" />
        <span>{eyebrow}</span>
      </div>
      <h2
        id={id}
        className="font-sans font-bold text-3xl sm:text-4xl text-on-surface tracking-tight text-balance"
      >
        {title}
      </h2>
      {body && (
        <p className="font-sans text-base sm:text-lg text-on-surface-variant leading-relaxed">
          {body}
        </p>
      )}
    </div>
  );
}
