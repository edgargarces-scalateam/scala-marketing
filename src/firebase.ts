import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
const env = (import.meta as any).env;
export const configured = !!env.VITE_FIREBASE_PROJECT_ID;
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "demo-scala.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "demo-scala",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "demo-scala.appspot.com",
  appId: env.VITE_FIREBASE_APP_ID || "demo-app",
});
export const auth = getAuth(app),
  db = getFirestore(app),
  storage = getStorage(app);
if (env.DEV && env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}

export const demoEnabled = env.DEV || env.VITE_ENABLE_DEMO === "true";
export const attachmentsEnabled = env.DEV
  ? env.VITE_ATTACHMENTS_ENABLED !== "false"
  : env.VITE_ATTACHMENTS_ENABLED === "true";
