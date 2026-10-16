const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];
for (const key of required)
  if (!process.env[key]) throw Error(`Missing GitHub Actions variable: ${key}`);
if (
  process.env.VITE_FIREBASE_PROJECT_ID.startsWith("demo-") ||
  process.env.VITE_USE_EMULATORS !== "false"
)
  throw Error(
    "Production deployment must use the real Firebase project with emulators disabled.",
  );
console.log("Production browser configuration validated.");
