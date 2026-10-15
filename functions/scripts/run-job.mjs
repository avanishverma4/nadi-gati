// Runs one scheduled Cloud Function once, outside Firebase: used by the GitHub Actions schedule in
// .github/workflows/scheduled-jobs.yml so the project can stay on the free Spark plan.
//
//   node scripts/run-job.mjs <ingestOpenMeteo|ingestOpenWeather|ingestDataGov|purgeExpiredData>
//
// Needs a build first (npm run build). Reads from the environment:
//   FIREBASE_SERVICE_ACCOUNT_KEY  service account JSON with Firestore access (required)
//   FIRESTORE_DATABASE_ID         optional; defaults to the app's named database (src/firestore.ts)
//   OPENWEATHER_API_KEY, DATA_GOV_IN_API_KEY, DATA_GOV_RESOURCE_ID  as the functions expect
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const JOBS = {
  ingestOpenMeteo: "../lib/ingestOpenMeteo.js",
  ingestOpenWeather: "../lib/ingestOpenWeather.js",
  ingestDataGov: "../lib/ingestDataGov.js",
  purgeExpiredData: "../lib/retention.js",
};

const name = process.argv[2];
if (!JOBS[name]) {
  console.error(`Usage: node scripts/run-job.mjs <${Object.keys(JOBS).join("|")}>`);
  process.exit(2);
}
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not set");
  process.exit(2);
}

const { initializeApp, cert } = require("firebase-admin/app");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
// Must run before the job module touches Firestore, like initializeApp() in src/index.ts
initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });

const job = require(JOBS[name])[name];
await job.run({ scheduleTime: new Date().toISOString(), jobName: name });
console.info(`${name} finished`);
// Firestore keeps its connection open; the job is done
process.exit(0);
