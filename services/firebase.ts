import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAfL8kirOrmG5hxusmtR0SE5oXWLoZ_W2Q",
  authDomain: "intellilearn-99dcf-e93c2.firebaseapp.com",
  projectId: "intellilearn-99dcf-e93c2",
  storageBucket: "intellilearn-99dcf-e93c2.firebasestorage.app",
  messagingSenderId: "78060427100",
  appId: "1:78060427100:web:f9b42822cfd72d4a915399",
  measurementId: "G-DC2KL4B1CX"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);