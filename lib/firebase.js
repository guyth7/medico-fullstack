// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyCSE19dqC92zC9q9P0H40JF7CAJWhOm2SU",
  authDomain: "medical-record-system-97a1f.firebaseapp.com",
  databaseURL: "https://medical-record-system-97a1f-default-rtdb.firebaseio.com",
  projectId: "medical-record-system-97a1f",
  storageBucket: "medical-record-system-97a1f.firebasestorage.app",
  messagingSenderId: "158318298038",
  appId: "1:158318298038:web:c3f9953e2a25674a1ff717",
  measurementId: "G-XCFMDVERL1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "(default)");
