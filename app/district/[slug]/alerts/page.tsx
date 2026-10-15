"use client";

import React, { useState } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";
import { PILOT_DISTRICTS_DATA } from "@/lib/hydrology-data";
import { AlertSubscriptionModal } from "@/components/alert-subscription-modal";
import { ALERTS_ENABLED } from "@/lib/features";

export default function DistrictAlertsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "bihar_patna";

  // Districts can be addressed by slug or id. Unknown URLs get the 404 page rather than
  // silently showing another district.
  const district = PILOT_DISTRICTS_DATA.find((d) => d.slug === slug || d.id === slug);
  if (!district) {
    notFound();
  }

  // The page exists to show the alert settings, so the modal opens straight away; closing it
  // returns to the district page
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    router.push(`/district/${district.slug}`);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant/60 shadow-elevation-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href={`/district/${district.slug}`}
              aria-label={`Back to ${district.name}`}
              className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-sans font-bold text-base sm:text-lg text-on-surface truncate">
                {district.name} Flood Alerts
              </h1>
              <span className="text-xs text-on-surface-variant font-sans">
                {district.state}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 max-w-lg mx-auto p-4 sm:p-6 flex flex-col justify-center items-center">
        <div className="p-6 rounded-xl border border-outline-variant/80 bg-surface-container-low text-center space-y-4 shadow-elevation-1">
          <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container mx-auto flex items-center justify-center">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="font-sans font-bold text-lg text-on-surface">
              Manage {district.name} Alerts
            </h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {ALERTS_ENABLED
                ? `Get a notification on this device when a river in ${district.name} passes the level you choose.`
                : "Flood alerts aren't available yet. Until then, check the district page and call 1077 or 112 in an emergency."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-full py-2.5 px-4 rounded-full bg-primary text-on-primary font-sans text-xs font-semibold shadow-elevation-1 hover:brightness-110 transition-all"
          >
            {ALERTS_ENABLED ? "Alert settings" : "More about alerts"}
          </button>
        </div>
      </main>

      <AlertSubscriptionModal
        isOpen={isOpen}
        onClose={handleClose}
        districtId={district.id}
        districtName={district.name}
        stateName={district.state}
      />
    </div>
  );
}
