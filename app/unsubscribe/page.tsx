import { redirect } from "next/navigation";

// Old address for the unsubscribe page. Redirect to the real one, keeping ?sub= and ?token=
// so links that were already sent out keep working.
export default async function LegacyUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  const query = params.toString();
  redirect(`/alerts/unsubscribe${query ? `?${query}` : ""}`);
}
