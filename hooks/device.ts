/**
 * Browser checks shared by the install prompt and the alert modal. Call them only in the browser.
 */

/**
 * iPhone, iPad or iPod. iPadOS Safari reports itself as a Mac ("MacIntel"), so a Mac with a
 * touch screen is treated as an iPad; real Macs have no touch points.
 */
export function isIOSDevice(): boolean {
  const { userAgent, platform, maxTouchPoints } = window.navigator;
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

/** Running as an installed app (from the home screen) rather than in a browser tab. */
export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
