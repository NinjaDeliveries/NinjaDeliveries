import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./Firebase";
import "./style.css";
import BusinessList from "../pages/BusinessList";

const BusinessDataFetch = () => {
  const [data, setData] = useState([]);
  const [Loader, setLoader] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "businessDetails"),
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
      <h1 className="heading"> Businesses </h1>
      <h5 className="heading2 mb-5 ">Store List</h5>
      <div className="heading3">
        <span className="mx-4 p-3">Store Name</span>
        <span className="mx-5">Edit</span>
      </div>
      <div className="my-4">
        {Loader === false && data.map((item) => <BusinessList item={item} />)}
      </div>
    </div>
  );
};

export default BusinessDataFetch;
