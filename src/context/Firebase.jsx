import React from "react";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

import { createContext, useContext } from "react";
const FirebaseContext = createContext(null);
export const useFirebase = () => useContext(FirebaseContext);

const firebaseConfig = {
  apiKey: "AIzaSyDbH98YuZfFNYRJaxFipG_AhZoTIQFWpI4",
  authDomain: "ninjadeliveries-91007.firebaseapp.com",
  databaseURL: "https://ninjadeliveries-91007-default-rtdb.firebaseio.com",
  projectId: "ninjadeliveries-91007",
  storageBucket: "ninjadeliveries-91007.appspot.com",
  messagingSenderId: "1047234268136",
  appId: "1:1047234268136:web:b0c45fb632a7a3a0bf325d",
  measurementId: "G-DBTMJRGSR9",
};

const firebaseApp = initializeApp(firebaseConfig);
export const firestore = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const auth = getAuth();
export const db = getFirestore(firebaseApp);
export const refStorage = ref();

export const FirebaseProvider = (props) => {
  return (
    <div>
      <FirebaseContext.Provider value={{}}>
        {props.children}
      </FirebaseContext.Provider>
    </div>
  );
};
