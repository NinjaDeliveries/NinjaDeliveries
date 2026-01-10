import React from "react";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth"; 
import { getStorage, ref, uploadBytes } from "firebase/storage";

import { getFirestore, collection, addDoc } from "firebase/firestore";

import { createContext, useContext } from "react";
const FirebaseContext = createContext(null);
export const useFirebase = () => useContext(FirebaseContext);

const firebaseConfig = {
  apiKey: "AIzaSyDbH98YuZfFNYRJaxFipG_AhZoTIQFWpI4",
  authDomain: "ninjadeliveries-91007.firebaseapp.com",
  databaseURL: "https://ninjadeliveries-91007-default-rtdb.firebaseio.com",
  projectId: "ninjadeliveries-91007",
  storageBucket: "ninjadeliveries-91007.firebasestorage.app",
  messagingSenderId: "1047234268136",
  appId: "1:1047234268136:web:b0c45fb632a7a3a0bf325d",
  measurementId: "G-DBTMJRGSR9",
};

const firebaseApp = initializeApp(firebaseConfig);

export const firestore = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

export const auth = getAuth(firebaseApp);

// 🔥 ONLY REQUIRED FIX (NO SIDE EFFECTS)
setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(firebaseApp);
export const refStorage = ref();

// Simple admin activity logger (login / logout / actions)
export const logActivity = async (data) => {
  try {
    await addDoc(collection(db, "admin_activity_logs"), {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};

export const FirebaseProvider = (props) => {
  return (
    <div>
      <FirebaseContext.Provider value={{}}>
        {props.children}
      </FirebaseContext.Provider>
    </div>
  );
};
