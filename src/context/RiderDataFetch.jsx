import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./Firebase";
import RiderList from "../pages/RiderList";
import "./style.css";

const RiderDataFetch = () => {
  const [data, setData] = useState([]);
  const [Loader, setLoader] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "riderDetails"),
      (snapshot) => {
        const newData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(newData);
        setLoader(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h1 className="heading"> Riders </h1>
      <h5 className="heading2 mb-5 mt-3">RiderList</h5>
      <div className="heading3">
        <span className="mx-4 p-3">Username</span>
        <span className="mx-5">Edit</span>
      </div>
      <div className="my-4">
        {Loader === false && data.map((item) => <RiderList item={item} />)}
      </div>
    </div>
  );
};

export default RiderDataFetch;
