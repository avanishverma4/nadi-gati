/**
 * Public source-code repository. Leave empty until the repository is public: every "View the
 * code" link is hidden while this is empty, so visitors never land on a GitHub 404.
 */
export const REPO_URL = "";

// Sent to OpenStreetMap's Nominatim with every lookup. Its usage policy asks for a User-Agent
// that identifies the app and gives a working contact.
export const NOMINATIM_USER_AGENT = `Nadi-Gati-FloodReporting/1.0 (${
  REPO_URL ? `${REPO_URL}; ` : ""
}contact: safety@nadi-gati.org)`;
