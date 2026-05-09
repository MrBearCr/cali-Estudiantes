import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDLoT0UT6Mjqt79imx3L-VEgCvF5kM2SwM",
  authDomain: "ucla-dcee.firebaseapp.com",
  projectId: "ucla-dcee",
  storageBucket: "ucla-dcee.firebasestorage.app",
  messagingSenderId: "979938594101",
  appId: "1:979938594101:web:33175aa41323550fa1107c"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
