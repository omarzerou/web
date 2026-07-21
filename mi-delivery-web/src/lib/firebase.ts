import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Estos valores deben venir del panel de Firebase
// Configuración de web123-d0f06
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Evitar que Next.js inicialice Firebase múltiples veces en dev
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const adminApp = getApps().find(a => a.name === "admin") || initializeApp(firebaseConfig, "admin");
const adminAuth = getAuth(adminApp);

const superAdminApp = getApps().find(a => a.name === "superadmin") || initializeApp(firebaseConfig, "superadmin");
const superAdminAuth = getAuth(superAdminApp);

import { getStorage } from "firebase/storage";
const storage = getStorage(app);

export { app, auth, adminAuth, superAdminAuth, storage };
