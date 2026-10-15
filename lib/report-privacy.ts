// Privacy safeguards applied in the browser before a flood report leaves the reporter's device.
// The privacy page (/about/privacy) describes these, so keep the two in step.

/** Decimal places kept on report coordinates: 3 places is roughly 100 m, enough to place the
 * flooding without pinpointing a doorstep. */
const REPORT_COORDINATE_DECIMALS = 3;

/** Geohash length stored with a report: 7 characters is a cell of about 150 m. The corroboration
 * function recomputes it with the same precision (functions/src/corroboration.ts). */
export const REPORT_GEOHASH_PRECISION = 7;

// At 2048 px and quality 0.85 a phone photo comes out at roughly 0.5–1.5 MB: plenty of detail,
// quick on a weak connection, and well under the 5 MB limit in storage.rules
const MAX_PHOTO_EDGE_PX = 2048;
const PHOTO_JPEG_QUALITY = 0.85;

export function roundReportCoordinate(value: number): number {
  const factor = 10 ** REPORT_COORDINATE_DECIMALS;
  return Math.round(value * factor) / factor;
}

// createImageBitmap where available (fast, and it can apply EXIF rotation); an <img> otherwise
async function decodeImage(
  file: File
): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    // "from-image" applies the EXIF rotation to the pixels, so the photo stays upright once the
    // metadata is gone
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Redraws a photo on a canvas and re-encodes it as JPEG. Only pixels survive, so EXIF data
 * (GPS position, camera model, serial number, capture time) is dropped. Large photos are scaled
 * down to save data on weak connections. Throws if the browser cannot decode the image; callers
 * must then skip the photo rather than upload the original.
 */
export async function stripPhotoMetadata(file: File): Promise<Blob> {
  const image = await decodeImage(file);
  const scale = Math.min(1, MAX_PHOTO_EDGE_PX / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.drawImage(image, 0, 0, width, height);
  if ("close" in image && typeof image.close === "function") image.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode photo"))),
      "image/jpeg",
      PHOTO_JPEG_QUALITY
    );
  });
}
