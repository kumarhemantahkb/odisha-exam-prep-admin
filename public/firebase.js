import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ଏବେ ଏହି API Key ୧୦୦% ଠିକ୍ ଅଛି
const firebaseConfig = {
  apiKey: "AIzaSyB4421V6H2lR1Oxb2dzognSpgjhaE9Qe4U",
  authDomain: "odisha-exam-prep-7ee0b.firebaseapp.com",
  projectId: "odisha-exam-prep-7ee0b",
  storageBucket: "odisha-exam-prep-7ee0b.firebasestorage.app",
  messagingSenderId: "794731481188",
  appId: "1:794731481188:web:cbe9369d12b8eb1a1d7771"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);