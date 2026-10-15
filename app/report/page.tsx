"use client";

import React, { use, useState, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BrickWall,
  Camera,
  Car,
  Check,
  CheckCircle2,
  Clock,
  EyeOff,
  ImageOff,
  Loader2,
  Lock,
  MapPin,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  UserX,
  Users,
  Waves,
  X,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { MapPinPicker } from "@/components/map-pin-picker";
import { PILOT_DISTRICTS_DATA } from "@/lib/hydrology-data";
import { db, storage } from "@/lib/firebase-client";
import { doc, setDoc, onSnapshot, serverTimestamp, GeoPoint } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as geofire from "geofire-common";
import {
  REPORT_GEOHASH_PRECISION,
  roundReportCoordinate,
  stripPhotoMetadata,
} from "@/lib/report-privacy";
import { RISE_TILE_VARIANTS, STAGGER_GRID_VARIANTS } from "@/lib/motion-variants";

type ReportCategory = "road_submerged" | "embankment_breach" | "river_overflow" | "other";

interface CategoryOption {
  id: ReportCategory;
  icon: React.ElementType;
  label: string;
  description: string;
  /** Stored as the report's description when the reporter doesn't write one */
  defaultDescription: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: "road_submerged",
    icon: Car,
    label: "Road cut off",
    description: "A road, bridge or culvert is under water or can't be crossed.",
    defaultDescription: "Road under water or cut off",
  },
  {
    id: "embankment_breach",
    icon: BrickWall,
    label: "Embankment damage",
    description: "An embankment or bundh is leaking, eroding or has broken.",
    defaultDescription: "Embankment leaking, eroding or broken",
  },
  {
    id: "river_overflow",
    icon: Waves,
    label: "Rising water",
    description: "A river is overflowing, or water is spreading into fields or homes.",
    defaultDescription: "River rising or overflowing its banks",
  },
  {
    id: "other",
    icon: AlertTriangle,
    label: "Something else",
    description: "Waterlogging, a sudden water release or another flood danger.",
    defaultDescription: "Other flood danger",
  },
];

const PRIVACY_POINTS = [
  { id: "anonymous", icon: UserX, text: "No name, phone number or account" },
  { id: "pin", icon: MapPin, text: "Your pin is rounded to about 100 m" },
  { id: "photo", icon: EyeOff, text: "Hidden location data is removed from photos" },
];

// Keep in step with PROXIMITY_RADIUS_METERS and TIME_WINDOW_HOURS in functions/src/corroboration.ts
const MATCH_RADIUS_KM = 15;
const MATCH_WINDOW_HOURS = 24;

function StepCard({
  step,
  title,
  hint,
  optional = false,
  children,
}: {
  step: number;
  title: string;
  hint?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={RISE_TILE_VARIANTS}
      className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-5 sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-primary text-on-primary font-sans font-bold text-sm flex items-center justify-center flex-shrink-0">
            {step}
          </span>
          <h2 className="font-sans font-bold text-lg sm:text-xl text-on-surface tracking-tight">
            {title}
            {optional && (
              <span className="ml-2 font-medium text-sm text-on-surface-variant">Optional</span>
            )}
          </h2>
        </div>
        {hint && (
          <span className="hidden sm:block font-sans text-sm text-on-surface-variant text-right">
            {hint}
          </span>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

/** Reads ?lat=&lng= (e.g. from "Report flooding here" on the map) as the starting pin */
function parseCoordinate(value: string | undefined, min: number, max: number): number | null {
  const parsed = value === undefined ? NaN : Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

// About 110 km. Further than this from every pilot district, a report can't be filed to one.
const MAX_DEGREES_FROM_PILOT_DISTRICT = 1;

// Unsent reports are kept on the device so a dropped signal or a page reload doesn't lose them.
// The photo isn't kept; it would need to be chosen again.
const DRAFT_STORAGE_KEY = "nadi-gati:report-draft";

// After this long without the save finishing, tell the person the network is slow
const SLOW_SAVE_NOTICE_MS = 15000;

interface ReportDraft {
  category: ReportCategory | null;
  description: string;
  latitude: number;
  longitude: number;
  pinPlaced: boolean;
}

// The draft saved on an earlier visit, read once per page load. The raw string is returned so
// useSyncExternalStore gets the same value on every call; the server has no draft.
let draftAtLoad: string | null | undefined;
function readDraftAtLoad(): string | null {
  if (draftAtLoad === undefined) {
    try {
      draftAtLoad = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    } catch {
      draftAtLoad = null;
    }
  }
  return draftAtLoad;
}
const noDraftOnServer = () => null;
const noSubscription = () => () => {};

function parseDraft(raw: string | null): ReportDraft | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReportDraft;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Storage blocked; nothing to clear
  }
}

export default function ReportFloodPage({
  searchParams,
}: {
  searchParams: Promise<{ lat?: string; lng?: string }>;
}) {
  const params = use(searchParams);
  const startLatitude = parseCoordinate(params.lat, 6, 38);
  const startLongitude = parseCoordinate(params.lng, 68, 98);
  const hasStartPin = startLatitude !== null && startLongitude !== null;

  // 1. What is happening (the only required choice)
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);

  // 2. Map pin: the spot passed in the URL, otherwise Patna, the Bihar pilot centre
  const [latitude, setLatitude] = useState<number>(hasStartPin ? startLatitude : 25.61);
  const [longitude, setLongitude] = useState<number>(hasStartPin ? startLongitude : 85.14);
  // The Patna default is only a starting view. A report can't go out until the person has
  // placed the pin themselves, or it would be filed at Patna whatever they are seeing.
  const [pinPlaced, setPinPlaced] = useState<boolean>(hasStartPin);

  // 3. Optional description and photo
  const [description, setDescription] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission and live match status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [reportDocData, setReportDocData] = useState<any>(null);
  const [photoSkipped, setPhotoSkipped] = useState<boolean>(false);
  const [slowSave, setSlowSave] = useState<boolean>(false);
  // An unsent report from an earlier visit (e.g. lost to a dropped signal or a reload). It is
  // offered back with Restore / Discard rather than filled in silently.
  const savedDraft = parseDraft(
    useSyncExternalStore(noSubscription, readDraftAtLoad, noDraftOnServer)
  );
  const [draftHandled, setDraftHandled] = useState<boolean>(false);
  const formTouched = Boolean(
    selectedCategory || description.trim() || (pinPlaced && !hasStartPin)
  );
  const showDraftOffer = Boolean(savedDraft) && !draftHandled && !formTouched;

  const restoreDraft = () => {
    if (!savedDraft) return;
    if (savedDraft.category && CATEGORY_OPTIONS.some((opt) => opt.id === savedDraft.category)) {
      setSelectedCategory(savedDraft.category);
    }
    if (typeof savedDraft.description === "string") {
      setDescription(savedDraft.description.slice(0, 1000));
    }
    // A pin passed in the URL wins over the draft's
    if (
      !hasStartPin &&
      savedDraft.pinPlaced &&
      Number.isFinite(savedDraft.latitude) &&
      Number.isFinite(savedDraft.longitude)
    ) {
      setLatitude(savedDraft.latitude);
      setLongitude(savedDraft.longitude);
      setPinPlaced(true);
    }
    setDraftHandled(true);
  };

  const discardDraft = () => {
    clearDraft();
    setDraftHandled(true);
  };

  // Keep the draft up to date while the report is unsent. An untouched form saves nothing, so
  // it never overwrites an earlier draft that hasn't been restored or discarded yet.
  useEffect(() => {
    if (submittedReportId || !formTouched) return;
    try {
      const draft: ReportDraft = {
        category: selectedCategory,
        description,
        latitude,
        longitude,
        pinPlaced,
      };
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Storage full or blocked; the form still works, just without a saved draft
    }
  }, [
    selectedCategory,
    description,
    latitude,
    longitude,
    pinPlaced,
    submittedReportId,
    formTouched,
  ]);

  // Nearest pilot district to the pin, and whether the pin is close enough to belong to it
  const { closestDistrict, inPilotArea } = useMemo(() => {
    let best = PILOT_DISTRICTS_DATA[0];
    let minDist = Infinity;
    for (const d of PILOT_DISTRICTS_DATA) {
      const dist = Math.hypot(d.latitude - latitude, d.longitude - longitude);
      if (dist < minDist) {
        minDist = dist;
        best = d;
      }
    }
    return { closestDistrict: best, inPilotArea: minDist <= MAX_DEGREES_FROM_PILOT_DISTRICT };
  }, [latitude, longitude]);

  const selectedOption = CATEGORY_OPTIONS.find((opt) => opt.id === selectedCategory) ?? null;

  // Photo selection (local preview only; metadata is stripped at submit time)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear the input when a file is rejected, or picking the same file again won't fire change
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError("That photo is over 10 MB. Please choose a smaller one.");
      e.target.value = "";
      return;
    }

    if (!file.type.match(/^image\/(jpeg|png|webp|gif|jpg)$/)) {
      setSubmitError("Please choose a JPEG, PNG, WebP or GIF image.");
      e.target.value = "";
      return;
    }

    setSubmitError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Clean up preview object URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOption) {
      setSubmitError("Choose what is happening before you send your report.");
      return;
    }

    if (!pinPlaced) {
      setSubmitError(
        "Show us where it is first: tap Use my location, or tap or drag the map to the spot."
      );
      return;
    }

    if (!inPilotArea) {
      setSubmitError(
        "That spot is outside the pilot area. For now we can only take reports from districts in Bihar and Assam."
      );
      return;
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setSubmitError(
        "You're offline. Your report is saved on this phone; send it when you have signal. If you are in danger, call 112."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSlowSave(false);
    const slowSaveTimer = setTimeout(() => setSlowSave(true), SLOW_SAVE_NOTICE_MS);

    try {
      // Round the pin to about 100 m so a report never pinpoints a home, then geohash it
      const reportLatitude = roundReportCoordinate(latitude);
      const reportLongitude = roundReportCoordinate(longitude);
      const geohash = geofire.geohashForLocation(
        [reportLatitude, reportLongitude],
        REPORT_GEOHASH_PRECISION
      );

      // Optional photo. If it can't be cleaned or uploaded, the report still goes out without it.
      let photoUrl: string | undefined = undefined;
      let skippedPhoto = false;
      if (photoFile) {
        setPhotoUploading(true);
        try {
          const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const storageRef = ref(storage, `report_photos/${photoId}`);
          // Re-encode first so GPS position, camera details and capture time never leave the device.
          // If that fails, the catch below skips the photo; the original file is never uploaded.
          const cleanPhoto = await stripPhotoMetadata(photoFile);
          await uploadBytes(storageRef, cleanPhoto, {
            contentType: "image/jpeg",
            customMetadata: {
              anonymous: "true",
            },
          });
          photoUrl = await getDownloadURL(storageRef);
        } catch {
          skippedPhoto = true;
        } finally {
          setPhotoUploading(false);
        }
      }

      // Reports are anonymous: nothing that identifies the reporter (account, IP, name, email) is
      // ever stored. firestore.rules only accepts the fields below; confidence must start at 0,
      // and only the corroboration function can raise it.
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const reportPayload = {
        category: selectedOption.id,
        description: description.trim() || selectedOption.defaultDescription,
        location: new GeoPoint(reportLatitude, reportLongitude),
        geohash: geohash,
        createdAt: serverTimestamp(),
        confidence: 0, // Invariant: Must start at 0 on creation
        ...(photoUrl ? { photoUrl } : {}),
        districtId: closestDistrict.id,
      };

      // On a weak signal this can take a long time. We keep waiting rather than retrying with a
      // new ID, which could file the same report twice once the first write gets through.
      await setDoc(doc(db, "reports", reportId), reportPayload);

      clearDraft();
      setPhotoSkipped(skippedPhoto);
      setSubmittedReportId(reportId);
      setReportDocData({ id: reportId, ...reportPayload });
    } catch {
      // Never show success for a report that wasn't saved: people must know to try again
      setSubmitError(
        "We couldn't send your report. Check your connection and try again. If you are in danger, call 112."
      );
    } finally {
      clearTimeout(slowSaveTimer);
      setSlowSave(false);
      setIsSubmitting(false);
    }
  };

  // Follow the saved report so its status updates when the matching function
  // (functions/src/corroboration.ts) finds other reports nearby
  useEffect(() => {
    if (!submittedReportId) return;

    let unsub: (() => void) | null = null;
    try {
      unsub = onSnapshot(
        doc(db, "reports", submittedReportId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setReportDocData((prev: any) => ({ ...prev, ...data }));
          }
        },
        () => {
          // The report is saved; if live updates fail it simply stays "unconfirmed" here
        }
      );
    } catch {
      // Same as above
    }

    return () => {
      if (unsub) unsub();
    };
  }, [submittedReportId]);

  const resetForm = () => {
    setSubmittedReportId(null);
    setReportDocData(null);
    setSelectedCategory(null);
    setDescription("");
    setPhotoSkipped(false);
    handleRemovePhoto();
  };

  const matchCount: number = reportDocData?.corroboratedBy?.length ?? 0;
  const hasMatches = (reportDocData?.confidence ?? 0) > 0 && matchCount > 0;
  const submittedOption = CATEGORY_OPTIONS.find((opt) => opt.id === reportDocData?.category);

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <SiteHeader />

      {/* reducedMotion="user" keeps a plain fade for visitors who prefer reduced motion */}
      <MotionConfig reducedMotion="user">
        <main id="main-content" className="flex-1 flex flex-col">
          {/* =========================================================================
              HEADER
              ========================================================================= */}
          <section
            id="report-hero"
            aria-labelledby="report-title"
            className="border-b border-outline-variant/50 bg-gradient-to-b from-error/10 via-surface to-surface"
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10 sm:pt-14 sm:pb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-error/30 bg-error-container/50 text-on-error-container text-xs font-sans font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-error" aria-hidden="true" />
                <span>Report a flood</span>
              </div>
              <h1
                id="report-title"
                className="mt-5 font-sans font-bold text-4xl sm:text-5xl text-on-surface tracking-tight leading-[1.08] text-balance"
              >
                {submittedReportId ? "Thank you for reporting" : "What are you seeing?"}
              </h1>
              <p className="mt-4 font-sans text-base sm:text-xl text-on-surface-variant leading-relaxed max-w-2xl">
                {submittedReportId
                  ? `Your report is now on the ${closestDistrict.name} page, where people nearby can see it.`
                  : "Tell your neighbours what's happening near you. It takes under a minute, and you don't need an account."}
              </p>
              <div className="mt-6 inline-flex items-start gap-2.5 rounded-2xl border border-outline-variant/70 bg-surface-container-low/90 px-4 py-3 font-sans text-sm text-on-surface-variant">
                <Phone className="w-4 h-4 text-error flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong className="font-semibold text-on-surface">In danger right now?</strong>{" "}
                  Call{" "}
                  <a href="tel:112" className="font-bold text-error hover:underline">
                    112
                  </a>{" "}
                  or{" "}
                  <a href="tel:1078" className="font-bold text-error hover:underline">
                    1078
                  </a>{" "}
                  first. A report does not send help.
                </span>
              </div>
            </div>
          </section>

          <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            {submittedReportId ? (
              /* =====================================================================
                 SENT
                 ===================================================================== */
              <motion.div
                id="report-submitted"
                className="max-w-3xl mx-auto flex flex-col gap-5"
                variants={STAGGER_GRID_VARIANTS}
                initial="hidden"
                animate="show"
              >
                <motion.div
                  variants={RISE_TILE_VARIANTS}
                  className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 sm:p-8"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-14 h-14 rounded-full bg-success-container flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-7 h-7 text-success" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="font-sans font-bold text-2xl text-on-surface tracking-tight">
                        Your report is live
                      </h2>
                      <p className="font-sans text-sm sm:text-base text-on-surface-variant mt-0.5">
                        People checking {closestDistrict.name} can now see it.
                      </p>
                    </div>
                  </div>

                  {/* Live match status */}
                  <div
                    id="corroboration-live-card"
                    aria-live="polite"
                    className={`mt-6 rounded-2xl border p-5 transition-colors ${
                      hasMatches
                        ? "bg-success-container/40 border-success/40"
                        : "bg-surface border-outline-variant/60"
                    }`}
                  >
                    {hasMatches ? (
                      <span
                        id="corroboration-badge-matches"
                        className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-success-container"
                      >
                        <span className="w-7 h-7 rounded-full bg-surface flex items-center justify-center">
                          <Users className="w-4 h-4 text-success" aria-hidden="true" />
                        </span>
                        <span className="font-sans font-semibold text-sm text-on-surface">
                          Matches {matchCount} nearby {matchCount === 1 ? "report" : "reports"}
                        </span>
                      </span>
                    ) : (
                      <span
                        id="corroboration-badge-unconfirmed"
                        className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-tertiary-container"
                      >
                        <span className="w-7 h-7 rounded-full bg-surface flex items-center justify-center">
                          <Clock className="w-4 h-4 text-tertiary" aria-hidden="true" />
                        </span>
                        <span className="font-sans font-semibold text-sm text-on-surface">
                          First report — unconfirmed
                        </span>
                      </span>
                    )}
                    <p className="font-sans text-sm sm:text-base text-on-surface-variant leading-relaxed mt-3">
                      {hasMatches
                        ? `${matchCount} other ${matchCount === 1 ? "person has" : "people have"} reported flooding within ${MATCH_RADIUS_KM} km in the last ${MATCH_WINDOW_HOURS} hours.`
                        : `We look for other reports within ${MATCH_RADIUS_KM} km from the last ${MATCH_WINDOW_HOURS} hours. This updates by itself if any are found, so there's no need to report again.`}
                    </p>
                    <Link
                      href="/about/verification"
                      className="mt-3 inline-flex items-center gap-1 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4"
                    >
                      What the labels mean
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>

                  {/* What was sent */}
                  <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-outline-variant/60 bg-outline-variant/50">
                    {[
                      { label: "What", value: submittedOption?.label ?? "Flood report" },
                      {
                        label: "Where",
                        value: `Near ${closestDistrict.name}, ${closestDistrict.state}`,
                      },
                      {
                        label: "Photo",
                        value: photoSkipped
                          ? "Couldn't be uploaded, report sent without it"
                          : reportDocData?.photoUrl
                            ? "Added"
                            : "None",
                      },
                    ].map((item) => (
                      <div key={item.label} className="bg-surface px-4 py-3">
                        <dt className="font-sans text-xs font-semibold text-on-surface-variant">
                          {item.label}
                        </dt>
                        <dd className="font-sans text-sm text-on-surface mt-0.5">{item.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-4 flex items-start gap-2 font-sans text-sm text-on-surface-variant">
                    <ShieldCheck
                      className="w-4 h-4 text-success flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    Sent anonymously, with the location rounded to about 100 metres.
                  </p>
                </motion.div>

                <motion.div
                  variants={RISE_TILE_VARIANTS}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <Link
                    href={`/district/${closestDistrict.slug}`}
                    id="view-district-dashboard-btn"
                    className="inline-flex items-center justify-center gap-2 h-[52px] px-6 rounded-full bg-primary text-on-primary font-sans font-semibold text-base hover:brightness-110 transition-all"
                  >
                    See {closestDistrict.name}
                    <ArrowRight className="w-5 h-5" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={resetForm}
                    id="submit-another-btn"
                    className="inline-flex items-center justify-center gap-2 h-[52px] px-6 rounded-full border border-outline-variant bg-surface-container text-on-surface font-sans font-semibold text-base hover:bg-surface-container-high transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <RotateCcw className="w-5 h-5" aria-hidden="true" />
                    Send another report
                  </button>
                </motion.div>
              </motion.div>
            ) : (
              /* =====================================================================
                 FORM
                 ===================================================================== */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                <motion.form
                  onSubmit={handleSubmit}
                  id="flood-report-form"
                  className="lg:col-span-8 flex flex-col gap-5"
                  variants={STAGGER_GRID_VARIANTS}
                  // No entrance animation: the form must be usable before JavaScript loads on a slow signal
                  initial={false}
                  animate="show"
                >
                  {showDraftOffer && (
                    <div
                      id="report-draft-offer"
                      role="status"
                      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-primary/40 bg-primary-container/30 px-4 py-3"
                    >
                      <p className="flex-1 font-sans text-sm text-on-surface">
                        You have a report you didn&apos;t send earlier.
                        {savedDraft?.category
                          ? ` (${CATEGORY_OPTIONS.find((opt) => opt.id === savedDraft.category)?.label ?? "Report"})`
                          : ""}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={restoreDraft}
                          className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-primary text-on-primary font-sans font-semibold text-sm hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          Restore it
                        </button>
                        <button
                          type="button"
                          onClick={discardDraft}
                          className="inline-flex items-center justify-center h-11 px-5 rounded-full border border-outline-variant bg-surface text-on-surface font-sans font-semibold text-sm hover:bg-surface-container transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 1. What */}
                  <StepCard
                    step={1}
                    title="What is happening?"
                    hint={selectedOption ? "1 chosen" : "Choose one"}
                  >
                    <div
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                      role="radiogroup"
                      aria-label="What is happening"
                    >
                      {CATEGORY_OPTIONS.map((opt, index) => {
                        const isSelected = selectedCategory === opt.id;
                        // Radio-group keyboard pattern: the group is one Tab stop (the chosen
                        // option, or the first), and the arrow keys move and select within it
                        const isTabStop = isSelected || (!selectedCategory && index === 0);
                        const moveSelection = (e: React.KeyboardEvent<HTMLButtonElement>) => {
                          const step =
                            e.key === "ArrowRight" || e.key === "ArrowDown"
                              ? 1
                              : e.key === "ArrowLeft" || e.key === "ArrowUp"
                                ? -1
                                : 0;
                          if (!step) return;
                          e.preventDefault();
                          const next =
                            CATEGORY_OPTIONS[
                              (index + step + CATEGORY_OPTIONS.length) % CATEGORY_OPTIONS.length
                            ];
                          setSelectedCategory(next.id);
                          document.getElementById(`category-chip-${next.id}`)?.focus();
                        };
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            id={`category-chip-${opt.id}`}
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={isTabStop ? 0 : -1}
                            onKeyDown={moveSelection}
                            onClick={() => setSelectedCategory(opt.id)}
                            className={`relative flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              isSelected
                                ? "bg-primary-container border-primary ring-1 ring-primary"
                                : "bg-surface border-outline-variant/70 hover:border-primary/50 hover:bg-surface-container"
                            }`}
                          >
                            <span
                              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-primary text-on-primary"
                                  : "bg-primary-container text-primary"
                              }`}
                            >
                              <opt.icon className="w-5 h-5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1 pr-6">
                              <span className="block font-sans font-bold text-base text-on-surface">
                                {opt.label}
                              </span>
                              <span className="block font-sans text-sm text-on-surface-variant leading-snug mt-0.5">
                                {opt.description}
                              </span>
                            </span>
                            <span
                              className={`absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                                isSelected
                                  ? "bg-primary border-primary text-on-primary"
                                  : "border-outline text-transparent"
                              }`}
                              aria-hidden="true"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </StepCard>

                  {/* 2. Where */}
                  <StepCard
                    step={2}
                    title="Where is it?"
                    hint={
                      !pinPlaced
                        ? "Not set yet"
                        : inPilotArea
                          ? `Near ${closestDistrict.name}, ${closestDistrict.state}`
                          : "Outside the pilot area"
                    }
                  >
                    <p className="font-sans text-sm text-on-surface-variant leading-relaxed mb-4">
                      Move the pin to the flooding itself, such as the road or embankment, not your
                      home. We round it to about 100 metres before sending.
                    </p>
                    <MapPinPicker
                      latitude={latitude}
                      longitude={longitude}
                      onChange={(newLat, newLng) => {
                        setLatitude(newLat);
                        setLongitude(newLng);
                        setPinPlaced(true);
                        setSubmitError(null);
                      }}
                    />
                    <p className="sm:hidden mt-3 font-sans text-sm text-on-surface-variant">
                      {!pinPlaced
                        ? "Location not set yet"
                        : inPilotArea
                          ? `Near ${closestDistrict.name}, ${closestDistrict.state}`
                          : "Outside the pilot area"}
                    </p>
                  </StepCard>

                  {/* 3. Details */}
                  <StepCard step={3} title="Add details" optional>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <label
                        htmlFor="report-description"
                        className="font-sans text-sm font-semibold text-on-surface"
                      >
                        What do you see?
                      </label>
                      <span className="font-sans text-xs text-on-surface-variant">
                        {description.length} / 1000
                      </span>
                    </div>
                    <textarea
                      id="report-description"
                      rows={3}
                      maxLength={1000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="For example: knee-deep water on the bypass road, still rising"
                      className="w-full rounded-2xl border border-outline bg-surface px-4 py-3 font-sans text-base text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors resize-y min-h-[96px]"
                    />
                    <p className="mt-1.5 font-sans text-sm text-on-surface-variant">
                      Please leave out names and phone numbers. Reports are public.
                    </p>

                    <div className="mt-6">
                      <div className="font-sans text-sm font-semibold text-on-surface mb-1.5">
                        Photo
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="photo-file-input"
                      />

                      {photoPreview ? (
                        <div
                          id="photo-preview-box"
                          className="relative w-full h-56 rounded-2xl border border-outline-variant overflow-hidden bg-surface"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoPreview}
                            alt="Preview of the photo you chose"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            id="remove-photo-btn"
                            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            aria-label="Remove photo"
                          >
                            <X className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-sm px-3 py-1 font-sans text-xs text-white">
                            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                            Hidden data will be removed before sending
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          id="upload-photo-btn"
                          className="group w-full rounded-2xl border-2 border-dashed border-outline-variant bg-surface hover:border-primary/60 hover:bg-surface-container transition-colors px-4 py-7 flex flex-col items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span className="w-12 h-12 rounded-2xl bg-primary-container text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Camera className="w-6 h-6" aria-hidden="true" />
                          </span>
                          <span className="font-sans font-semibold text-sm text-primary">
                            Take or choose a photo
                          </span>
                          <span className="font-sans text-xs text-on-surface-variant text-center">
                            Up to 10 MB. Show the water, not people or number plates.
                          </span>
                        </button>
                      )}
                    </div>
                  </StepCard>

                  {/* Send */}
                  <motion.div variants={RISE_TILE_VARIANTS} className="flex flex-col gap-3">
                    {submitError && (
                      <div
                        id="submit-error-banner"
                        role="alert"
                        className="flex items-start gap-2.5 rounded-2xl border border-error/40 bg-error-container/60 px-4 py-3 font-sans text-sm text-on-error-container"
                      >
                        <AlertCircle
                          className="w-4 h-4 flex-shrink-0 mt-0.5 text-error"
                          aria-hidden="true"
                        />
                        <span>{submitError}</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedCategory}
                      id="submit-flood-report-btn"
                      className="w-full inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full bg-error text-on-error font-sans font-bold text-base shadow-elevation-2 hover:brightness-110 active:brightness-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                          {photoUploading
                            ? "Sending photo…"
                            : slowSave
                              ? "Weak signal, still sending…"
                              : "Sending report…"}
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" aria-hidden="true" />
                          {submitError ? "Try again" : "Send report"}
                        </>
                      )}
                    </button>
                    {slowSave && (
                      <p
                        role="status"
                        className="font-sans text-sm text-center text-on-surface-variant"
                      >
                        This is taking a while. Keep this page open and we&apos;ll finish sending
                        when the signal improves. If you are in danger, call 112.
                      </p>
                    )}
                    <p className="font-sans text-sm text-center text-on-surface-variant">
                      {!selectedCategory
                        ? "Choose what is happening in step 1 to send your report."
                        : !pinPlaced
                          ? "Set the location in step 2 to send your report."
                          : `Your report is anonymous and will show on the ${closestDistrict.name} page.`}
                    </p>
                  </motion.div>
                </motion.form>

                {/* Sidebar */}
                <aside className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-5">
                  <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6">
                    <span className="w-11 h-11 rounded-2xl bg-primary-container flex items-center justify-center">
                      <Lock className="w-5 h-5 text-primary" aria-hidden="true" />
                    </span>
                    <h2 className="font-sans font-bold text-lg text-on-surface tracking-tight mt-4">
                      Anonymous by design
                    </h2>
                    <ul className="mt-3 flex flex-col gap-3 list-none">
                      {PRIVACY_POINTS.map((point) => (
                        <li
                          key={point.id}
                          className="flex items-start gap-2.5 font-sans text-sm text-on-surface leading-snug"
                        >
                          <point.icon
                            className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          {point.text}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/about/privacy"
                      className="mt-4 inline-flex items-center gap-1 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4"
                    >
                      What we store
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>

                  <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6">
                    <h2 className="font-sans font-bold text-lg text-on-surface tracking-tight">
                      What happens next
                    </h2>
                    <ol className="mt-3 flex flex-col gap-3 list-none">
                      {[
                        "Your report appears on your district page for people nearby.",
                        `We look for other reports within ${MATCH_RADIUS_KM} km from the last ${MATCH_WINDOW_HOURS} hours.`,
                        "It shows as unconfirmed until others report the same area.",
                      ].map((text, index) => (
                        <li
                          key={text}
                          className="flex items-start gap-3 font-sans text-sm text-on-surface-variant leading-snug"
                        >
                          <span className="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface font-semibold text-xs flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </span>
                          {text}
                        </li>
                      ))}
                    </ol>
                    <Link
                      href="/about/verification"
                      className="mt-4 inline-flex items-center gap-1 font-sans font-semibold text-sm text-primary hover:underline underline-offset-4"
                    >
                      How reports are checked
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>

                  <div className="rounded-3xl border border-outline-variant/70 bg-surface-container-low p-6 flex items-start gap-3">
                    <ImageOff
                      className="w-5 h-5 text-on-surface-variant flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <p className="font-sans text-sm text-on-surface-variant leading-relaxed">
                      Reports and photos are public. Please don&apos;t include faces, number plates
                      or anyone&apos;s personal details.
                    </p>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </main>
      </MotionConfig>
    </div>
  );
}
