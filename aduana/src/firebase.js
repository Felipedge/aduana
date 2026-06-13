import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCUlsrZpS9x2RssiyuFtI-Am1V4_FbI43U",
  authDomain: "aduana-7500b.firebaseapp.com",
  projectId: "aduana-7500b",
  storageBucket: "aduana-7500b.firebasestorage.app",
  messagingSenderId: "364059935244",
  appId: "1:364059935244:web:c6807d64c590344df0a429",
  measurementId: "G-24R8G0S43P"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
