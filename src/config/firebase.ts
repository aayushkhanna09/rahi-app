import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAiZVUNm3iPF_b2YQN__i5v6sYPD4l5uE8",
    authDomain: "rahi-app-efa76.firebaseapp.com",
    projectId: "rahi-app-efa76",
    storageBucket: "rahi-app-efa76.firebasestorage.app",
    messagingSenderId: "743169416878",
    appId: "1:743169416878:web:902309dec355f4a85bd73f"
};


const app = initializeApp(firebaseConfig);

// THIS IS THE NEW AUTH SETUP
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

const database = getFirestore(app);

export { auth, database };