import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCdO59xKG82eF6IYS0j8vDbqNF9i_HCi40",
    authDomain: "etherium-66bca.firebaseapp.com",
    projectId: "etherium-66bca",
    storageBucket: "etherium-66bca.firebasestorage.app",
    messagingSenderId: "1057778373854",
    appId: "1:1057778373854:web:8d78bc39a64fbaad255e4f",
    measurementId: "G-LQETSF3CNH"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export const storage = getStorage(app);
