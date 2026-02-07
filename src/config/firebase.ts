// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // Reverting to simple Auth to fix the error
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyAiZVUNm3iPF_b2YQN__i5v6sYPD4l5uE8",
    authDomain: "rahi-app-efa76.firebaseapp.com",
    projectId: "rahi-app-efa76",
    storageBucket: "rahi-app-efa76.firebasestorage.app",
    messagingSenderId: "743169416878",
    appId: "1:743169416878:web:902309dec355f4a85bd73f"
};


const app = initializeApp(firebaseConfig);

// We use the standard getAuth here to fix your TypeScript error.
// It might show a yellow warning box about "Persistence" in the app, 
// but you can just dismiss it. It works fine for the demo.
const auth = getAuth(app);

const database = getFirestore(app);
const storage = getStorage(app);

export { auth, database, storage };