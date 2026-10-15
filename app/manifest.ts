import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nadi-Gati | River levels and flood reports",
    short_name: "Nadi-Gati",
    description:
      "River levels and community flood reports for districts in Bihar and Assam. A free, open-source pilot; not an official warning service.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // No orientation lock: river charts and maps read better in landscape, and locking the
    // orientation fails WCAG 1.3.4
    background_color: "#fafafa",
    theme_color: "#0963ab",
    icons: [
      {
        src: "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
