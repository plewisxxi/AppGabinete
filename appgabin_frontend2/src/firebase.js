// src/firebase.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdspaXPzVrcAhXpTZGhhr14jxKpv3HeM0",
  authDomain: "appgabdishac.firebaseapp.com",
  projectId: "appgabdishac",
  storageBucket: "appgabdishac.firebasestorage.app",
  messagingSenderId: "742837603140",
  appId: "1:742837603140:web:31374a2cca2fbaaf1aa511"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Google Auth Provider with proper settings
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
