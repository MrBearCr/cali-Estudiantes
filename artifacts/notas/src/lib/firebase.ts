import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDLoT0UT6Mjqt79imx3L-VEgCvF5kM2SwM",
  authDomain: "ucla-dcee.firebaseapp.com",
  projectId: "ucla-dcee",
  storageBucket: "ucla-dcee.firebasestorage.app",
  messagingSenderId: "979938594101",
  appId: "1:979938594101:web:33175aa41323550fa1107c",
  measurementId: "G-4JKGYTZEGJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
