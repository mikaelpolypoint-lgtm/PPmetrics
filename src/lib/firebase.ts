import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace these values with the config from your Firebase Console
// Go to: https://console.firebase.google.com/project/mikael-vibe-apps/settings/general/
const firebaseConfig = {
    apiKey: "AIzaSyAEx8rKL8gYWnGpADDPPGuRfajPo7TsiVQ", // <--- UPDATE THIS
    authDomain: "mikael-vibe-apps.firebaseapp.com",
    projectId: "mikael-vibe-apps",
    storageBucket: "mikael-vibe-apps.firebasestorage.app",
    messagingSenderId: "243732549696", // I found this project number earlier
    appId: "1:243732549696:web:c35642347270fea3394fa5", // <--- UPDATE THIS
    measurementId: "G-CBHL9Q97HH" // Optional
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
