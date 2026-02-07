// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
// We import Auth, Firestore, and Storage to use them later
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// REPLACE THE OBJECT BELOW WITH YOUR COPIED KEYS FROM FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyAiZVUNm3iPF_b2YQN__i5v6sYPD4l5uE8",
    authDomain: "rahi-app-efa76.firebaseapp.com",
    projectId: "rahi-app-efa76",
    storageBucket: "rahi-app-efa76.firebasestorage.app",
    messagingSenderId: "743169416878",
    appId: "1:743169416878:web:902309dec355f4a85bd73f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services so other files can use them
export const auth = getAuth(app);
export const database = getFirestore(app);
export const storage = getStorage(app);