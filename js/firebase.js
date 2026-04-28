import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ──────────────────────────────────────────────
// Firebase Configuration
// Replace these with your real Firebase project credentials.
// Get them from: https://console.firebase.google.com → Project Settings
// ──────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Demo mode: true when Firebase has placeholder keys
const isDemoMode = firebaseConfig.apiKey === "YOUR_API_KEY";

if (isDemoMode) {
    console.log('%c⚠️ Firebase placeholder config — DEMO MODE active', 'color: #fbbf24; font-weight: bold;');
    console.log('%c   Set real Firebase credentials in js/firebase.js for production', 'color: #999;');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export {
    auth, db, provider, isDemoMode,
    signInWithPopup, signOut, onAuthStateChanged,
    collection, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
    doc, query, where, orderBy, serverTimestamp
};
