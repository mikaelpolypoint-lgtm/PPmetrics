import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD-JDc9MVG9GlEkKNV3SA8hKUPo680Hu4Y",
    authDomain: "metrics-96e88.firebaseapp.com",
    projectId: "metrics-96e88",
    storageBucket: "metrics-96e88.firebasestorage.app",
    messagingSenderId: "168553491984",
    appId: "1:168553491984:web:6e5471c21e9e7b555aa495",
    measurementId: "G-KVYJ8EHK21"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
