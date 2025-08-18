
// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "repairdesk-lite-49152",
  appId: "1:340840688158:web:8aea5c544e3229c2f95c0f",
  storageBucket: "repairdesk-lite-49152.firebasestorage.app",
  apiKey: "AIzaSyDEFK_FP3AG_RXpSbRAMDPFB0iAIrqR9Ws",
  authDomain: "repairdesk-lite-49152.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "340840688158"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
