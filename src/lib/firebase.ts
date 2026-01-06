import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace these values with the config from your Firebase Console
// Go to: https://console.firebase.google.com/project/mikael-vibe-apps/settings/general/
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // <--- UPDATE THIS
    authDomain: "mikael-vibe-apps.firebaseapp.com",
    projectId: "mikael-vibe-apps",
    storageBucket: "mikael-vibe-apps.firebasestorage.app",
    messagingSenderId: "243732549696", // I found this project number earlier
    appId: "YOUR_APP_ID", // <--- UPDATE THIS
    measurementId: "YOUR_MEASUREMENT_ID" // Optional
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
